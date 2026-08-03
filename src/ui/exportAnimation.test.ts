import { describe, expect, it } from 'vitest';
import { enableAnimation } from '../engine/animation';
import { createDocument, createFrame, createLayer } from '../engine/document';
import type { DreamDocument } from '../engine/types';
import {
  exportAnimationWebM,
  pickWebmMimeType,
  spriteSheetFileName,
  videoDurationSeconds,
  videoFileName,
  WEBM_MIME_CANDIDATES,
  type RecorderLike,
} from './exportAnimation';
import { MockContext2D } from '../test/mockContext';

function animatedDoc(frameCount = 3): DreamDocument {
  let doc = enableAnimation(createDocument({ width: 8, height: 8, name: 'Bounce' }));
  for (let i = 1; i < frameCount; i += 1) {
    const frame = createFrame([createLayer(`Layer ${i + 1}`)]);
    doc = { ...doc, frames: [...(doc.frames ?? []), frame] };
  }
  return doc;
}

/** Fake canvas good enough for renderDocument (recording mock 2D context). */
function fakeCanvas() {
  const ctx = new MockContext2D();
  return {
    canvas: {
      width: 0,
      height: 0,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement,
    ctx,
  };
}

/** Fake recorder that immediately emits one chunk on stop. */
function fakeRecorder(started: { value: boolean }, stopped: { value: boolean }): RecorderLike {
  const rec: RecorderLike = {
    ondataavailable: null,
    onstop: null,
    start() {
      started.value = true;
    },
    stop() {
      stopped.value = true;
      rec.ondataavailable?.({ data: new Blob(['webm-bytes']) });
      rec.onstop?.();
    },
  };
  return rec;
}

describe('pickWebmMimeType', () => {
  it('prefers VP9, then VP8, then bare webm', () => {
    expect(pickWebmMimeType(() => true)).toBe('video/webm;codecs=vp9');
    expect(pickWebmMimeType((m) => !m.includes('vp9'))).toBe('video/webm;codecs=vp8');
    expect(pickWebmMimeType((m) => m === 'video/webm')).toBe('video/webm');
  });

  it('returns null when nothing is supported', () => {
    expect(pickWebmMimeType(() => false)).toBeNull();
  });

  it('tries every candidate in order', () => {
    const seen: string[] = [];
    pickWebmMimeType((m) => {
      seen.push(m);
      return false;
    });
    expect(seen).toEqual(WEBM_MIME_CANDIDATES);
  });
});

describe('filename generation', () => {
  it('uses the document name, trimmed, with fallbacks', () => {
    expect(videoFileName('Bounce')).toBe('Bounce.webm');
    expect(videoFileName('  ')).toBe('dream.webm');
    expect(spriteSheetFileName('Bounce')).toBe('Bounce-frames.png');
    expect(spriteSheetFileName('')).toBe('dream-frames.png');
  });
});

describe('videoDurationSeconds', () => {
  it('derives duration from frame count and fps', () => {
    expect(videoDurationSeconds(animatedDoc(12), 6)).toBe(2);
    expect(videoDurationSeconds(createDocument({ width: 8, height: 8 }), 6)).toBe(0);
  });
});

describe('exportAnimationWebM', () => {
  it('rejects without frames before touching any browser API', async () => {
    const doc = createDocument({ width: 8, height: 8 });
    await expect(exportAnimationWebM(doc, { fps: 6 })).rejects.toThrow('add some frames');
  });

  it('rejects when no WebM codec is supported', async () => {
    await expect(
      exportAnimationWebM(animatedDoc(), { fps: 6 }, { isTypeSupported: () => false }),
    ).rejects.toThrow('cannot record WebM');
  });

  it('records every frame, reports progress and assembles the blob', async () => {
    const doc = animatedDoc(3);
    const { canvas } = fakeCanvas();
    const started = { value: false };
    const stopped = { value: false };
    const progress: [number, number][] = [];
    const waits: number[] = [];

    const blob = await exportAnimationWebM(
      doc,
      { fps: 10, onProgress: (done, total) => progress.push([done, total]) },
      {
        isTypeSupported: () => true,
        createCanvas: () => canvas,
        createRecorder: () => fakeRecorder(started, stopped),
        wait: (ms) => {
          waits.push(ms);
          return Promise.resolve();
        },
      },
    );

    expect(started.value).toBe(true);
    expect(stopped.value).toBe(true);
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
    expect(waits).toEqual([100, 100, 100]); // 1000ms / 10fps per frame
    expect(blob.type).toBe('video/webm;codecs=vp9');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders each frame into the canvas (background painted per frame)', async () => {
    const doc = animatedDoc(2);
    const { canvas, ctx } = fakeCanvas();
    await exportAnimationWebM(
      doc,
      { fps: 6 },
      {
        isTypeSupported: () => true,
        createCanvas: () => canvas,
        createRecorder: () => fakeRecorder({ value: false }, { value: false }),
        wait: () => Promise.resolve(),
      },
    );
    // Each frame paints the document background → one fillRect per frame.
    expect(ctx.calls('fillRect').length).toBe(2);
  });

  it('mixes the narration take in when the document has one', async () => {
    const narration = { audio: 'data:audio/webm;base64,AAAA', durationMs: 1200 };
    const doc = { ...animatedDoc(2), narration };
    const { canvas } = fakeCanvas();
    const seen: { narration?: unknown; fps?: number; mime?: string } = {};
    let finished = false;
    let plainRecorderUsed = false;

    const blob = await exportAnimationWebM(
      doc,
      { fps: 10 },
      {
        isTypeSupported: () => true,
        createCanvas: () => canvas,
        createRecorder: () => {
          plainRecorderUsed = true;
          return fakeRecorder({ value: false }, { value: false });
        },
        createRecorderWithNarration: (c, mime, n, fps) => {
          expect(c).toBe(canvas);
          seen.mime = mime;
          seen.narration = n;
          seen.fps = fps;
          return Promise.resolve({
            recorder: fakeRecorder({ value: false }, { value: false }),
            finish: () => {
              finished = true;
              return Promise.resolve();
            },
          });
        },
        wait: () => Promise.resolve(),
      },
    );

    expect(plainRecorderUsed).toBe(false);
    expect(seen.narration).toEqual(narration);
    expect(seen.fps).toBe(10);
    expect(seen.mime).toBe('video/webm;codecs=vp9');
    expect(finished).toBe(true); // mixer released after recording stops
    expect(blob.size).toBeGreaterThan(0);
  });

  it('uses the plain recorder when there is no narration', async () => {
    const doc = animatedDoc(1);
    const { canvas } = fakeCanvas();
    let narrationPathUsed = false;
    await exportAnimationWebM(
      doc,
      { fps: 6 },
      {
        isTypeSupported: () => true,
        createCanvas: () => canvas,
        createRecorder: () => fakeRecorder({ value: false }, { value: false }),
        createRecorderWithNarration: () => {
          narrationPathUsed = true;
          return Promise.resolve({ recorder: fakeRecorder({ value: false }, { value: false }) });
        },
        wait: () => Promise.resolve(),
      },
    );
    expect(narrationPathUsed).toBe(false);
  });
});
