/**
 * Voice narration: record one take over the flipbook (or a presentation),
 * keep it on the document as a data URL, play it back in sync, and bake it
 * into exported WebM videos.
 *
 * Privacy: the mic is asked for on the first record only, and the take never
 * leaves the device — it lives in IndexedDB and `.dream` files like the rest
 * of the document.
 *
 * One track per document, starting at time 0. Per-frame tracks were
 * considered and cut: a single "tell the whole story" take matches how kids
 * and presenters actually narrate, and keeps recording a one-tap gesture.
 *
 * The browser-only bits — getUserMedia, MediaRecorder, AudioContext,
 * HTMLAudioElement — sit behind injectable deps so the state machine, error
 * mapping, serialization and stream composition stay unit-testable in jsdom
 * (same pattern as exportAnimation.ts).
 */

import type { DreamDocument, Narration } from '../engine/types';

export const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

/** Warn when a take would make the saved project balloon past ~10 MB. */
export const NARRATION_WARN_BYTES = 10 * 1024 * 1024;

/** First supported audio variant, or null to let MediaRecorder pick. */
export function pickAudioMimeType(isSupported: (mime: string) => boolean): string | null {
  for (const mime of AUDIO_MIME_CANDIDATES) {
    if (isSupported(mime)) return mime;
  }
  return null;
}

/** Rough decoded size of a base64 data URL (the payload, not the prefix). */
export function narrationDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const unpadded = base64.replace(/=+$/, '');
  return Math.floor((unpadded.length * 3) / 4);
}

/** Map a getUserMedia/recorder failure to a friendly, jargon-free i18n key. */
export function narrationErrorKey(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'narration.errorDenied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'narration.errorNoMic';
    case 'NotReadableError':
      return 'narration.errorBusy';
    default:
      return 'narration.errorGeneric';
  }
}

/** True where recording narration is possible at all (button hides otherwise). */
export function isNarrationSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

/** Serialize a take for the document: Blob → base64 data URL. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the recording.'));
    reader.readAsDataURL(blob);
  });
}

/** Decode a base64 data URL back to bytes (for the export mixer). */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The slice of MediaRecorder the recorder needs. */
export interface AudioRecorderLike {
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start(): void;
  stop(): void;
}

/** Mic-level metering while recording (drives the recording indicator). */
export interface NarrationMeter {
  /** Current mic level, 0..1. */
  level(): number;
  close(): void;
}

export interface NarrationRecorderDeps {
  /** Defaults to navigator.mediaDevices.getUserMedia({ audio: true }). */
  getUserMedia?: () => Promise<MediaStream>;
  /** Defaults to MediaRecorder with the first supported audio mime. */
  createRecorder?: (stream: MediaStream) => AudioRecorderLike;
  /** Defaults to an AnalyserNode meter; pass null-safe fakes in tests. */
  createMeter?: (stream: MediaStream) => NarrationMeter | null;
  /** Defaults to performance.now. */
  now?: () => number;
}

export type NarrationRecorderState = 'idle' | 'recording' | 'error';

export interface NarrationTake {
  blob: Blob;
  durationMs: number;
}

export interface NarrationRecorder {
  readonly state: NarrationRecorderState;
  /** i18n key of the last failure, when state is 'error'. */
  readonly errorKey: string | null;
  /** Current mic level, 0..1 (0 when not recording or without a meter). */
  level(): number;
  /** Ms since the current take started. */
  elapsedMs(): number;
  /** Ask for the mic and start recording. Errors land in state, never throw. */
  start(): Promise<void>;
  /** Finish and keep the take; resolves null when there was nothing to keep. */
  stop(): Promise<NarrationTake | null>;
  /** Abort the take, discarding everything recorded so far. */
  cancel(): void;
  /** Subscribe to state changes; returns the unsubscribe. */
  onChange(listener: () => void): () => void;
}

/** Thin AnalyserNode meter; null where WebAudio is missing or refuses. */
function createAnalyserMeter(stream: MediaStream): NarrationMeter | null {
  const Ctor = globalThis.AudioContext;
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    return {
      level() {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const value of data) peak = Math.max(peak, Math.abs(value - 128));
        return Math.min(1, peak / 64);
      },
      close() {
        void ctx.close();
      },
    };
  } catch {
    return null;
  }
}

/**
 * The idle → recording → idle/error state machine. One active take at a
 * time; starting while recording is a no-op, stopping while idle keeps
 * nothing. The mic stream is released after every take.
 */
export function createNarrationRecorder(deps: NarrationRecorderDeps = {}): NarrationRecorder {
  const now = deps.now ?? (() => performance.now());
  let state: NarrationRecorderState = 'idle';
  let errorKey: string | null = null;
  let stream: MediaStream | null = null;
  let recorder: AudioRecorderLike | null = null;
  let meter: NarrationMeter | null = null;
  let chunks: Blob[] = [];
  let mimeType = '';
  let startedAt = 0;
  let stopped: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const setState = (next: NarrationRecorderState, key: string | null = null) => {
    state = next;
    errorKey = key;
    for (const listener of listeners) listener();
  };

  const releaseMic = () => {
    meter?.close();
    meter = null;
    try {
      stream?.getTracks().forEach((track) => track.stop?.());
    } catch {
      // Releasing the mic is best-effort; a stopped track is harmless.
    }
    stream = null;
    recorder = null;
  };

  return {
    get state() {
      return state;
    },
    get errorKey() {
      return errorKey;
    },
    level: () => (state === 'recording' ? (meter?.level() ?? 0) : 0),
    elapsedMs: () => (state === 'recording' ? Math.max(0, now() - startedAt) : 0),

    async start() {
      if (state === 'recording') return;
      const getUserMedia =
        deps.getUserMedia ?? (() => navigator.mediaDevices.getUserMedia({ audio: true }));
      if (!deps.getUserMedia && !isNarrationSupported()) {
        setState('error', 'narration.errorUnsupported');
        return;
      }
      try {
        stream = await getUserMedia();
      } catch (error) {
        setState('error', narrationErrorKey(error));
        return;
      }
      const createRecorder =
        deps.createRecorder ??
        ((s: MediaStream): AudioRecorderLike => {
          const picked = pickAudioMimeType((mime) => MediaRecorder.isTypeSupported(mime));
          mimeType = picked ?? '';
          return (
            picked ? new MediaRecorder(s, { mimeType: picked }) : new MediaRecorder(s)
          ) as AudioRecorderLike;
        });
      const active = createRecorder(stream);
      recorder = active;
      chunks = [];
      active.ondataavailable = (event: { data: Blob }) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      stopped = new Promise<void>((resolve) => {
        active.onstop = () => resolve();
      });
      const createMeter = deps.createMeter ?? createAnalyserMeter;
      meter = createMeter(stream) ?? null;
      startedAt = now();
      active.start();
      setState('recording');
    },

    async stop() {
      if (state !== 'recording' || !recorder) return null;
      const active = recorder;
      active.stop();
      await stopped;
      const durationMs = Math.max(0, now() - startedAt);
      const blob = new Blob(chunks, { type: mimeType });
      releaseMic();
      setState('idle');
      return { blob, durationMs };
    },

    cancel() {
      if (state !== 'recording') return;
      try {
        recorder?.stop();
      } catch {
        // Cancelling is best-effort; the take is discarded either way.
      }
      chunks = [];
      releaseMic();
      setState('idle');
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let shared: NarrationRecorder | null = null;

/** The one app-wide recorder (mic + take state), created on first use. */
export function sharedNarrationRecorder(): NarrationRecorder {
  shared ??= createNarrationRecorder();
  return shared;
}

/** The store slice the record/save flows touch (faked in tests). */
export interface NarrationFlowStore {
  doc: DreamDocument;
  play(): void;
  pause(): void;
  setNarration(narration: Narration | null): void;
}

/**
 * Start a take: mic on, recorder running, animation playing so the timing is
 * natural. Returns an i18n error key on failure, null on success.
 */
export async function beginNarrationTake(
  recorder: NarrationRecorder,
  store: NarrationFlowStore,
): Promise<string | null> {
  await recorder.start();
  if (recorder.state === 'error') return recorder.errorKey ?? 'narration.errorGeneric';
  if (recorder.state !== 'recording') return 'narration.errorGeneric';
  store.play();
  return null;
}

/** Stop the take and save it onto the document, replacing any previous one. */
export async function finishNarrationTake(
  recorder: NarrationRecorder,
  store: NarrationFlowStore,
): Promise<void> {
  const take = await recorder.stop();
  store.pause();
  if (!take) return;
  const audio = await blobToDataUrl(take.blob);
  store.setNarration({ audio, durationMs: take.durationMs });
}

/** The slice of HTMLAudioElement playback needs. */
export interface NarrationAudio {
  play(): Promise<void> | void;
  pause(): void;
}

export interface NarrationPlayback {
  stop(): void;
}

/**
 * Play a take from time 0 (editor playback, Present mode). Autoplay policies
 * can still refuse without a user gesture; narration is a bonus, never an
 * error, so refusals are swallowed.
 */
export function playNarration(
  narration: Narration,
  deps: { createAudio?: (src: string) => NarrationAudio } = {},
): NarrationPlayback {
  const createAudio = deps.createAudio ?? ((src: string) => new Audio(src));
  const el = createAudio(narration.audio);
  const result = el.play();
  if (result instanceof Promise) result.catch(() => {});
  return { stop: () => el.pause() };
}

/** Video tracks first, then the narration audio track(s). */
export function combineStreamTracks<T>(videoTracks: T[], audioTracks: T[]): T[] {
  return [...videoTracks, ...audioTracks];
}

/** The slice of AudioContext the export mixer needs. */
export interface AudioContextLike {
  decodeAudioData(data: ArrayBuffer): Promise<unknown>;
  createBufferSource(): {
    buffer: unknown;
    connect(destination: unknown): void;
    start(when?: number, offset?: number): void;
  };
  createMediaStreamDestination(): { stream: { getAudioTracks(): MediaStreamTrack[] } };
  close(): Promise<void>;
}

export interface NarrationMix {
  /** Canvas video tracks + the narration audio track, ready for MediaRecorder. */
  tracks: MediaStreamTrack[];
  /** Release the AudioContext once recording has stopped. */
  finish(): Promise<void>;
}

/**
 * Bake a take into a canvas capture stream: decode the data URL, play it from
 * the requested source offset through a MediaStreamDestination and combine
 * the tracks. A longer video simply goes quiet after the take ends.
 */
export async function mixNarrationTracks(
  canvasStream: { getVideoTracks(): MediaStreamTrack[] },
  narration: Narration,
  deps: { createAudioContext?: () => AudioContextLike } = {},
  startOffsetSeconds = 0,
): Promise<NarrationMix> {
  const createAudioContext =
    deps.createAudioContext ?? (() => new AudioContext() as unknown as AudioContextLike);
  const ctx = createAudioContext();
  const bytes = dataUrlToBytes(narration.audio);
  const buffer = await ctx.decodeAudioData(bytes.buffer as ArrayBuffer);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const destination = ctx.createMediaStreamDestination();
  source.connect(destination);
  source.start(0, Math.max(0, startOffsetSeconds));
  return {
    tracks: combineStreamTracks(canvasStream.getVideoTracks(), destination.stream.getAudioTracks()),
    finish: () => ctx.close(),
  };
}
