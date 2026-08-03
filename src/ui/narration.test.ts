import { describe, expect, it } from 'vitest';
import type { Narration } from '../engine/types';
import {
  beginNarrationTake,
  blobToDataUrl,
  combineStreamTracks,
  createNarrationRecorder,
  dataUrlToBytes,
  finishNarrationTake,
  isNarrationSupported,
  mixNarrationTracks,
  narrationDataUrlBytes,
  narrationErrorKey,
  pickAudioMimeType,
  playNarration,
  AUDIO_MIME_CANDIDATES,
  type AudioContextLike,
  type AudioRecorderLike,
  type NarrationFlowStore,
} from './narration';

/** Fake MediaRecorder: emits one chunk and stops synchronously. */
function fakeRecorder(): AudioRecorderLike & { started: boolean } {
  const rec: AudioRecorderLike & { started: boolean } = {
    started: false,
    ondataavailable: null,
    onstop: null,
    start() {
      rec.started = true;
    },
    stop() {
      rec.ondataavailable?.({ data: new Blob(['take-bytes']) });
      rec.onstop?.();
    },
  };
  return rec;
}

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: () => {} }] } as unknown as MediaStream;
}

function recorderDeps(now: { value: number }) {
  return {
    getUserMedia: () => Promise.resolve(fakeStream()),
    createRecorder: () => fakeRecorder(),
    createMeter: () => ({ level: () => 0.5, close: () => {} }),
    now: () => now.value,
  };
}

describe('pickAudioMimeType', () => {
  it('picks the first supported candidate in order', () => {
    expect(pickAudioMimeType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickAudioMimeType((m) => m === 'audio/mp4')).toBe('audio/mp4');
  });

  it('returns null when nothing is supported (MediaRecorder default)', () => {
    expect(pickAudioMimeType(() => false)).toBeNull();
    const seen: string[] = [];
    pickAudioMimeType((m) => {
      seen.push(m);
      return false;
    });
    expect(seen).toEqual(AUDIO_MIME_CANDIDATES);
  });
});

describe('narrationErrorKey', () => {
  it('maps permission and device failures to friendly keys', () => {
    expect(narrationErrorKey({ name: 'NotAllowedError' })).toBe('narration.errorDenied');
    expect(narrationErrorKey({ name: 'SecurityError' })).toBe('narration.errorDenied');
    expect(narrationErrorKey({ name: 'NotFoundError' })).toBe('narration.errorNoMic');
    expect(narrationErrorKey({ name: 'NotReadableError' })).toBe('narration.errorBusy');
    expect(narrationErrorKey(new Error('boom'))).toBe('narration.errorGeneric');
    expect(narrationErrorKey(undefined)).toBe('narration.errorGeneric');
  });
});

describe('serialization', () => {
  it('round-trips a blob through a data URL and back to bytes', async () => {
    const dataUrl = await blobToDataUrl(new Blob(['once upon a time'], { type: 'audio/webm' }));
    expect(dataUrl.startsWith('data:audio/webm;base64,')).toBe(true);
    const bytes = dataUrlToBytes(dataUrl);
    expect(new TextDecoder().decode(bytes)).toBe('once upon a time');
  });

  it('estimates the decoded size of a data URL', async () => {
    const dataUrl = await blobToDataUrl(new Blob(['1234']));
    expect(narrationDataUrlBytes(dataUrl)).toBe(4);
  });
});

describe('narration recorder state machine', () => {
  it('goes idle → recording → idle and keeps the take', async () => {
    const now = { value: 1000 };
    const recorder = createNarrationRecorder(recorderDeps(now));
    const states: string[] = [];
    recorder.onChange(() => states.push(recorder.state));

    expect(recorder.state).toBe('idle');
    await recorder.start();
    expect(recorder.state).toBe('recording');
    expect(recorder.level()).toBe(0.5);

    now.value = 3400;
    expect(recorder.elapsedMs()).toBe(2400);
    const take = await recorder.stop();
    expect(recorder.state).toBe('idle');
    expect(take?.durationMs).toBe(2400);
    expect(take?.blob.size).toBeGreaterThan(0);
    expect(states).toEqual(['recording', 'idle']);
  });

  it('maps a denied mic permission to an error state with a friendly key', async () => {
    const recorder = createNarrationRecorder({
      getUserMedia: () => Promise.reject({ name: 'NotAllowedError' }),
      createRecorder: () => fakeRecorder(),
      now: () => 0,
    });
    await recorder.start();
    expect(recorder.state).toBe('error');
    expect(recorder.errorKey).toBe('narration.errorDenied');
    expect(await recorder.stop()).toBeNull();
  });

  it('reports unsupported browsers without touching the mic', async () => {
    // jsdom has no mediaDevices and no MediaRecorder: the real default deps
    // must fail kindly instead of throwing.
    expect(isNarrationSupported()).toBe(false);
    const recorder = createNarrationRecorder();
    await recorder.start();
    expect(recorder.state).toBe('error');
    expect(recorder.errorKey).toBe('narration.errorUnsupported');
  });

  it('cancel discards the take and releases the mic', async () => {
    const now = { value: 0 };
    const recorder = createNarrationRecorder(recorderDeps(now));
    await recorder.start();
    recorder.cancel();
    expect(recorder.state).toBe('idle');
    expect(await recorder.stop()).toBeNull();
  });

  it('starting twice keeps one take', async () => {
    const now = { value: 0 };
    const recorder = createNarrationRecorder(recorderDeps(now));
    await recorder.start();
    await recorder.start(); // no-op while recording
    expect(recorder.state).toBe('recording');
    expect(await recorder.stop()).not.toBeNull();
  });
});

describe('record/save flows', () => {
  function fakeStore(): NarrationFlowStore & { played: boolean; saved: Narration | null } {
    const store: NarrationFlowStore & { played: boolean; saved: Narration | null } = {
      doc: {} as NarrationFlowStore['doc'],
      played: false,
      saved: null,
      play() {
        store.played = true;
      },
      pause() {
        store.played = false;
      },
      setNarration(n) {
        store.saved = n;
      },
    };
    return store;
  }

  it('begin starts playback so the timing is natural', async () => {
    const now = { value: 0 };
    const recorder = createNarrationRecorder(recorderDeps(now));
    const store = fakeStore();
    expect(await beginNarrationTake(recorder, store)).toBeNull();
    expect(store.played).toBe(true);
    expect(recorder.state).toBe('recording');
  });

  it('begin returns the error key when the mic is denied', async () => {
    const recorder = createNarrationRecorder({
      getUserMedia: () => Promise.reject({ name: 'NotFoundError' }),
      createRecorder: () => fakeRecorder(),
      now: () => 0,
    });
    const store = fakeStore();
    expect(await beginNarrationTake(recorder, store)).toBe('narration.errorNoMic');
    expect(store.played).toBe(false);
  });

  it('finish stops playback and saves the take onto the document', async () => {
    const now = { value: 0 };
    const recorder = createNarrationRecorder(recorderDeps(now));
    const store = fakeStore();
    await beginNarrationTake(recorder, store);
    now.value = 1500;
    await finishNarrationTake(recorder, store);
    expect(store.played).toBe(false);
    expect(store.saved?.durationMs).toBe(1500);
    expect(store.saved?.audio.startsWith('data:')).toBe(true);
  });
});

describe('playNarration', () => {
  const narration: Narration = { audio: 'data:audio/webm;base64,AAAA', durationMs: 1000 };

  it('plays from the start and pauses on stop', () => {
    const calls: string[] = [];
    const playback = playNarration(narration, {
      createAudio: (src) => {
        expect(src).toBe(narration.audio);
        return {
          play: () => {
            calls.push('play');
          },
          pause: () => {
            calls.push('pause');
          },
        };
      },
    });
    playback.stop();
    expect(calls).toEqual(['play', 'pause']);
  });

  it('swallows autoplay refusals', async () => {
    const playback = playNarration(narration, {
      createAudio: () => ({
        play: () => Promise.reject(new Error('autoplay')),
        pause: () => {},
      }),
    });
    playback.stop();
    // No unhandled rejection: the test completing cleanly is the assertion.
  });
});

describe('export mixing', () => {
  it('combines video tracks with the narration audio track', () => {
    expect(combineStreamTracks(['v1'], ['a1'])).toEqual(['v1', 'a1']);
    expect(combineStreamTracks([], [])).toEqual([]);
  });

  it('decodes the take, plays it into a destination and combines tracks', async () => {
    const narration: Narration = {
      audio: await blobToDataUrl(new Blob(['take'])),
      durationMs: 500,
    };
    const calls: string[] = [];
    const fakeCtx: AudioContextLike = {
      decodeAudioData: (data) => {
        expect(data.byteLength).toBe(4); // 'take'
        calls.push('decode');
        return Promise.resolve({ fake: 'buffer' });
      },
      createBufferSource: () => ({
        buffer: null,
        connect: () => calls.push('connect'),
        start: (when, offset) => {
          expect(when).toBe(0);
          expect(offset).toBe(1.25);
          calls.push('start');
        },
      }),
      createMediaStreamDestination: () => ({
        stream: { getAudioTracks: () => ['audio-track' as unknown as MediaStreamTrack] },
      }),
      close: () => {
        calls.push('close');
        return Promise.resolve();
      },
    };
    const canvasStream = {
      getVideoTracks: () => ['video-track' as unknown as MediaStreamTrack],
    };
    const mix = await mixNarrationTracks(
      canvasStream,
      narration,
      { createAudioContext: () => fakeCtx },
      1.25,
    );
    expect(mix.tracks).toEqual(['video-track', 'audio-track']);
    expect(calls).toEqual(['decode', 'connect', 'start']);
    await mix.finish();
    expect(calls).toContain('close');
  });
});
