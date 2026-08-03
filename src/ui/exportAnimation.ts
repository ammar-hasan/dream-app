/**
 * Animation export: WebM/MP4 video and PNG sprite sheet.
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
import type { DreamDocument, Frame, Narration } from '../engine/types';
import { mixNarrationTracks } from './narration';

export type VideoAspectPreset = 'original' | 'vertical' | 'square' | 'landscape';

export const SOCIAL_VIDEO_CAPTURE_FPS = 30;

export interface VideoOutputSize {
  width: number;
  height: number;
}

export interface VideoFrameLayout extends VideoOutputSize {
  scale: number;
  x: number;
  y: number;
}

/** Social-ready output sizes; original preserves the document dimensions. */
export function videoOutputSize(
  doc: Pick<DreamDocument, 'width' | 'height'>,
  aspect: VideoAspectPreset,
): VideoOutputSize {
  if (aspect === 'vertical') return { width: 720, height: 1280 };
  if (aspect === 'square') return { width: 720, height: 720 };
  if (aspect === 'landscape') return { width: 1280, height: 720 };
  return { width: doc.width, height: doc.height };
}

/** Contain the artwork without cropping or stretching, centered in the output. */
export function videoFrameLayout(
  doc: Pick<DreamDocument, 'width' | 'height'>,
  aspect: VideoAspectPreset,
): VideoFrameLayout {
  const output = videoOutputSize(doc, aspect);
  const scale = Math.min(output.width / doc.width, output.height / doc.height);
  return {
    ...output,
    scale,
    x: (output.width - doc.width * scale) / 2,
    y: (output.height - doc.height * scale) / 2,
  };
}

/** Wrap a short caption deterministically; the last of three lines ellipsizes. */
export function captionLines(text: string, maxChars: number, maxLines = 3): string[] {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean || maxChars < 1 || maxLines < 1) return [];
  const chunks = clean
    .split(' ')
    .flatMap((word) =>
      Array.from({ length: Math.ceil(word.length / maxChars) }, (_, index) =>
        word.slice(index * maxChars, (index + 1) * maxChars),
      ),
    );
  const lines: string[] = [];
  let index = 0;
  while (index < chunks.length && lines.length < maxLines) {
    let line = chunks[index];
    index += 1;
    while (index < chunks.length && `${line} ${chunks[index]}`.length <= maxChars) {
      line += ` ${chunks[index]}`;
      index += 1;
    }
    lines.push(line);
  }
  if (index < chunks.length && lines.length > 0) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }
  return lines;
}

/** Render one frame into its delivery canvas, then burn in its caption. */
export function renderVideoFrame(
  doc: DreamDocument,
  frame: Frame,
  ctx: CanvasRenderingContext2D,
  aspect: VideoAspectPreset,
): void {
  const layout = videoFrameLayout(doc, aspect);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.save();
  ctx.translate(layout.x, layout.y);
  ctx.scale(layout.scale, layout.scale);
  renderDocument({ ...doc, layers: frame.layers }, ctx, { background: false });
  ctx.restore();

  const caption = frame.presentation?.caption;
  if (!caption) return;
  const fontSize = Math.max(24, Math.min(52, Math.round(layout.width * 0.045)));
  const maxChars = Math.max(12, Math.floor((layout.width * 0.8) / (fontSize * 0.58)));
  const lines = captionLines(caption, maxChars);
  if (lines.length === 0) return;
  const lineHeight = Math.round(fontSize * 1.24);
  const padY = Math.round(fontSize * 0.42);
  const boxWidth = layout.width * 0.84;
  const boxHeight = lines.length * lineHeight + padY * 2;
  const boxX = (layout.width - boxWidth) / 2;
  const boxY = layout.height - Math.max(32, layout.height * 0.07) - boxHeight;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.76)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    ctx.fillText(line, layout.width / 2, boxY + padY + lineHeight * (index + 0.5));
  });
  ctx.restore();
}

export const WEBM_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export const MP4_MIME_CANDIDATES = [
  'video/mp4',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E',
];

/** First supported WebM variant (VP9 → VP8 → bare), or null when none. */
export function pickWebmMimeType(isSupported: (mime: string) => boolean): string | null {
  for (const mime of WEBM_MIME_CANDIDATES) {
    if (isSupported(mime)) return mime;
  }
  return null;
}

/** First browser-supported MP4 variant, or null when MP4 recording is unavailable. */
export function pickMp4MimeType(isSupported: (mime: string) => boolean): string | null {
  for (const mime of MP4_MIME_CANDIDATES) {
    if (isSupported(mime)) return mime;
  }
  return null;
}

/** Runtime capability used to hide an MP4 option that cannot work. */
export function supportsMp4Video(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    pickMp4MimeType((mime) => MediaRecorder.isTypeSupported(mime)) !== null
  );
}

export function videoFileName(
  docName: string,
  format: 'webm' | 'mp4' = 'webm',
  aspect: VideoAspectPreset = 'original',
): string {
  const suffix = aspect === 'original' ? '' : `-${aspect}`;
  return `${docName.trim() || 'dream'}${suffix}.${format}`;
}

export function spriteSheetFileName(docName: string): string {
  return `${docName.trim() || 'dream'}-frames.png`;
}

/** Total recording time in seconds — shown in the export dialog. */
export function videoDurationSeconds(
  doc: DreamDocument,
  fps: number,
  startFrame = 0,
  endFrame = (doc.frames?.length ?? 0) - 1,
): number {
  const range = videoFrameRange(doc.frames?.length ?? 0, startFrame, endFrame);
  return animationDurationMs(range.count, fps) / 1000;
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
    narrationOffsetSeconds: number,
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
  narrationOffsetSeconds: number,
): Promise<RecorderSession> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot record video (no MediaRecorder).');
  }
  const stream = canvas.captureStream(fps);
  const mix = await mixNarrationTracks(stream, narration, {}, narrationOffsetSeconds);
  return {
    recorder: new MediaRecorder(new MediaStream(mix.tracks), { mimeType }) as RecorderLike,
    finish: mix.finish,
  };
}

export interface VideoExportOptions {
  fps: number;
  /** Output canvas shape; artwork is contained without cropping. */
  aspect?: VideoAspectPreset;
  /** Inclusive zero-based frame range; omitted means the complete animation. */
  startFrame?: number;
  endFrame?: number;
  /** Called with (frame holds recorded so far, total frames). */
  onProgress?: (done: number, total: number) => void;
  /** Stops recording without returning a partial video. */
  signal?: AbortSignal;
}

function videoExportCancelled(): Error {
  const error = new Error('Video export cancelled');
  error.name = 'AbortError';
  return error;
}

function throwIfVideoCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw videoExportCancelled();
}

function waitForVideoValue<T>(
  request: Promise<T>,
  signal?: AbortSignal,
  discard?: (value: T) => void,
): Promise<T> {
  if (!signal) return request;
  if (signal.aborted) return Promise.reject(videoExportCancelled());
  return new Promise<T>((resolve, reject) => {
    const cancel = () => reject(videoExportCancelled());
    signal.addEventListener('abort', cancel, { once: true });
    request.then(
      (value) => {
        signal.removeEventListener('abort', cancel);
        if (signal.aborted) {
          discard?.(value);
          reject(videoExportCancelled());
        } else resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', cancel);
        reject(error);
      },
    );
  });
}

export function videoFrameRange(
  frameCount: number,
  startFrame = 0,
  endFrame = frameCount - 1,
): { start: number; end: number; count: number } {
  if (frameCount < 1) return { start: 0, end: -1, count: 0 };
  const start = Math.max(0, Math.min(frameCount - 1, Math.round(startFrame)));
  const end = Math.max(start, Math.min(frameCount - 1, Math.round(endFrame)));
  return { start, end, count: end - start + 1 };
}

/**
 * Render every frame for its 1/fps slice of real time into a canvas stream
 * and record it as WebM. Rejects with a friendly Error when the browser
 * can't record (no MediaRecorder, no supported codec, no frames).
 */
async function exportAnimationVideo(
  doc: DreamDocument,
  options: VideoExportOptions,
  format: 'webm' | 'mp4',
  deps: VideoExportDeps = {},
): Promise<Blob> {
  throwIfVideoCancelled(options.signal);
  const allFrames = doc.frames ?? [];
  if (allFrames.length === 0) throw new Error('Nothing to export — add some frames first.');
  const range = videoFrameRange(allFrames.length, options.startFrame, options.endFrame);
  const frames = allFrames.slice(range.start, range.end + 1);

  const isTypeSupported =
    deps.isTypeSupported ??
    ((mime: string) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime));
  const mimeType =
    format === 'webm' ? pickWebmMimeType(isTypeSupported) : pickMp4MimeType(isTypeSupported);
  if (!mimeType) {
    const label = format === 'webm' ? 'WebM' : 'MP4';
    throw new Error(`This browser cannot record ${label} video.`);
  }

  const createCanvas = deps.createCanvas ?? (() => document.createElement('canvas'));
  const canvas = createCanvas();
  const aspect = options.aspect ?? 'original';
  const output = videoOutputSize(doc, aspect);
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a canvas to render into.');

  const createRecorder =
    deps.createRecorder ??
    ((c: HTMLCanvasElement, mime: string): RecorderLike => {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('This browser cannot record video (no MediaRecorder).');
      }
      return new MediaRecorder(c.captureStream(SOCIAL_VIDEO_CAPTURE_FPS), {
        mimeType: mime,
      }) as RecorderLike;
    });
  const wait =
    deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  // With a narration take, the recorder gets the canvas video track plus the
  // take's audio track in one stream; without one, behavior is unchanged.
  let recorder: RecorderLike;
  let finish: (() => Promise<void>) | undefined;
  if (doc.narration) {
    const createSession = deps.createRecorderWithNarration ?? defaultRecorderWithNarration;
    const session = await waitForVideoValue(
      createSession(
        canvas,
        mimeType,
        doc.narration,
        SOCIAL_VIDEO_CAPTURE_FPS,
        range.start / options.fps,
      ),
      options.signal,
      (late) => {
        const cleanup = late.finish?.();
        void cleanup?.catch(() => {});
      },
    );
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
  try {
    for (let i = 0; i < frames.length; i += 1) {
      throwIfVideoCancelled(options.signal);
      renderVideoFrame(doc, frames[i], ctx, aspect);
      await waitForVideoValue(wait(frameMs), options.signal);
      options.onProgress?.(i + 1, frames.length);
    }
    throwIfVideoCancelled(options.signal);
  } finally {
    recorder.stop();
    await stopped;
    await finish?.();
  }
  throwIfVideoCancelled(options.signal);
  return new Blob(chunks, { type: mimeType });
}

/** Record the animation in the first supported WebM codec. */
export function exportAnimationWebM(
  doc: DreamDocument,
  options: VideoExportOptions,
  deps: VideoExportDeps = {},
): Promise<Blob> {
  return exportAnimationVideo(doc, options, 'webm', deps);
}

/** Record a real MP4 container when the browser natively supports it. */
export function exportAnimationMp4(
  doc: DreamDocument,
  options: VideoExportOptions,
  deps: VideoExportDeps = {},
): Promise<Blob> {
  return exportAnimationVideo(doc, options, 'mp4', deps);
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
