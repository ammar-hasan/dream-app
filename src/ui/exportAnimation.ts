/**
 * Animation export: WebM video and PNG sprite sheet.
 *
 * The browser-only bits (canvas.captureStream, MediaRecorder) are isolated
 * behind injectable deps so everything around them — mime fallback, filename
 * generation, progress reporting, error paths — stays unit-testable in
 * jsdom. GIF export was considered and skipped: it needs an encoder
 * dependency; the sprite sheet covers the "animated asset" use case with
 * zero new deps.
 */

import { animationDurationMs, spriteSheetLayout } from '../engine/animation';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument, Narration } from '../engine/types';
import { mixNarrationTracks } from './narration';

export const WEBM_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

/** First supported WebM variant (VP9 → VP8 → bare), or null when none. */
export function pickWebmMimeType(isSupported: (mime: string) => boolean): string | null {
  for (const mime of WEBM_MIME_CANDIDATES) {
    if (isSupported(mime)) return mime;
  }
  return null;
}

export function videoFileName(docName: string): string {
  return `${docName.trim() || 'dream'}.webm`;
}

export function spriteSheetFileName(docName: string): string {
  return `${docName.trim() || 'dream'}-frames.png`;
}

/** Total recording time in seconds — shown in the export dialog. */
export function videoDurationSeconds(doc: DreamDocument, fps: number): number {
  return animationDurationMs(doc.frames?.length ?? 0, fps) / 1000;
}

export interface RecorderLike {
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start(): void;
  stop(): void;
}

export interface VideoExportDeps {
  /** Defaults to MediaRecorder.isTypeSupported. */
  isTypeSupported?: (mime: string) => boolean;
  /** Defaults to document.createElement('canvas'); tests pass a fake. */
  createCanvas?: () => HTMLCanvasElement;
  /** Defaults to canvas.captureStream + new MediaRecorder. */
  createRecorder?: (canvas: HTMLCanvasElement, mimeType: string) => RecorderLike;
  /**
   * Narration path: capture the canvas, mix the take in via WebAudio and
   * record the combined stream. Defaults to captureStream +
   * mixNarrationTracks + new MediaRecorder.
   */
  createRecorderWithNarration?: (
    canvas: HTMLCanvasElement,
    mimeType: string,
    narration: Narration,
    fps: number,
  ) => Promise<RecorderSession>;
  /** Defaults to setTimeout; tests pass an instant wait. */
  wait?: (ms: number) => Promise<void>;
}

export interface RecorderSession {
  recorder: RecorderLike;
  /** Release mixer resources (the AudioContext) after recording stops. */
  finish?: () => Promise<void>;
}

/** Real WebAudio narration mix: canvas stream + decoded take → one recorder. */
async function defaultRecorderWithNarration(
  canvas: HTMLCanvasElement,
  mimeType: string,
  narration: Narration,
  fps: number,
): Promise<RecorderSession> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot record video (no MediaRecorder).');
  }
  const stream = canvas.captureStream(fps);
  const mix = await mixNarrationTracks(stream, narration);
  return {
    recorder: new MediaRecorder(new MediaStream(mix.tracks), { mimeType }) as RecorderLike,
    finish: mix.finish,
  };
}

export interface VideoExportOptions {
  fps: number;
  /** Called with (frames rendered so far, total frames). */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Render every frame for its 1/fps slice of real time into a canvas stream
 * and record it as WebM. Rejects with a friendly Error when the browser
 * can't record (no MediaRecorder, no supported codec, no frames).
 */
export async function exportAnimationWebM(
  doc: DreamDocument,
  options: VideoExportOptions,
  deps: VideoExportDeps = {},
): Promise<Blob> {
  const frames = doc.frames ?? [];
  if (frames.length === 0) throw new Error('Nothing to export — add some frames first.');

  const isTypeSupported =
    deps.isTypeSupported ??
    ((mime: string) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime));
  const mimeType = pickWebmMimeType(isTypeSupported);
  if (!mimeType) throw new Error('This browser cannot record WebM video.');

  const createCanvas = deps.createCanvas ?? (() => document.createElement('canvas'));
  const canvas = createCanvas();
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a canvas to render into.');

  const createRecorder =
    deps.createRecorder ??
    ((c: HTMLCanvasElement, mime: string): RecorderLike => {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('This browser cannot record video (no MediaRecorder).');
      }
      return new MediaRecorder(c.captureStream(options.fps), { mimeType: mime }) as RecorderLike;
    });
  const wait =
    deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  // With a narration take, the recorder gets the canvas video track plus the
  // take's audio track in one stream; without one, behavior is unchanged.
  let recorder: RecorderLike;
  let finish: (() => Promise<void>) | undefined;
  if (doc.narration) {
    const createSession = deps.createRecorderWithNarration ?? defaultRecorderWithNarration;
    const session = await createSession(canvas, mimeType, doc.narration, options.fps);
    recorder = session.recorder;
    finish = session.finish;
  } else {
    recorder = createRecorder(canvas, mimeType);
  }
  const chunks: Blob[] = [];
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.ondataavailable = (event: { data: Blob }) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start();

  const frameMs = 1000 / options.fps;
  for (let i = 0; i < frames.length; i += 1) {
    renderDocument({ ...doc, layers: frames[i].layers }, ctx);
    options.onProgress?.(i + 1, frames.length);
    await wait(frameMs);
  }
  recorder.stop();
  await stopped;
  await finish?.();
  return new Blob(chunks, { type: mimeType });
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Render all frames in a grid (one row per ~sqrt, max 8 columns) into a
 * single PNG and download it — the zero-dependency "animated asset".
 */
export function exportSpriteSheet(doc: DreamDocument): void {
  const frames = doc.frames ?? [];
  if (frames.length === 0) return;
  const layout = spriteSheetLayout(frames.length, doc.width, doc.height);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  frames.forEach((frame, i) => {
    ctx.save();
    ctx.translate(layout.positions[i].x, layout.positions[i].y);
    renderDocument({ ...doc, layers: frame.layers }, ctx);
    ctx.restore();
  });
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = spriteSheetFileName(doc.name);
  link.click();
}
