import { beforeEach, describe, expect, it } from 'vitest';
import type { Narration } from '../engine/types';
import { useDreamStore } from './dreamStore';

const store = () => useDreamStore.getState();

const take: Narration = { audio: 'data:audio/webm;base64,AAAA', durationMs: 2400 };

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'Test' });
  store().setNarrationMuted(false);
});

describe('narration on the document', () => {
  it('saves a take, marks the doc dirty and replaces it on re-record', () => {
    expect(store().doc.narration).toBeUndefined();
    store().setNarration(take);
    expect(store().doc.narration).toEqual(take);
    expect(store().isDirty).toBe(true);

    const second: Narration = { ...take, durationMs: 900 };
    store().setNarration(second);
    expect(store().doc.narration?.durationMs).toBe(900);
  });

  it('clears the take with null', () => {
    store().setNarration(take);
    store().setNarration(null);
    expect(store().doc.narration).toBeUndefined();
  });

  it('lives outside undo: undoing an edit never deletes the take', () => {
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerUp({ x: 5, y: 5 });
    store().setNarration(take);
    store().undo(); // undoes the stroke, not the narration
    expect(store().doc.narration).toEqual(take);
    store().redo();
    expect(store().doc.narration).toEqual(take);
  });

  it('survives new/loaded documents exactly like other document fields', () => {
    store().setNarration(take);
    const doc = store().doc;
    store().newDocument({ width: 10, height: 10 });
    expect(store().doc.narration).toBeUndefined();
    store().loadDocument(doc);
    expect(store().doc.narration).toEqual(take);
  });
});

describe('narrationMuted', () => {
  it('is a session toggle, off by default', () => {
    expect(store().narrationMuted).toBe(false);
    store().setNarrationMuted(true);
    expect(store().narrationMuted).toBe(true);
  });
});
