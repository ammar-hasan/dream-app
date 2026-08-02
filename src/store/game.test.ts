/** Store tests for Play mode: casting, settings, run state, high scores. */

import { beforeEach, describe, expect, it } from 'vitest';
import { readHighScore, useDreamStore } from './dreamStore';
import { DEFAULT_GAME_SETTINGS } from '../game/core';

function store() {
  return useDreamStore.getState();
}

beforeEach(() => {
  store().newDocument({ width: 800, height: 600 });
  localStorage.clear();
});

describe('casting', () => {
  it('casts a layer into a role and clears it back to the default', () => {
    const layerId = store().doc.layers[0].id;
    store().setGameCast('hero', layerId);
    expect(store().doc.game?.cast.hero).toBe(layerId);
    expect(store().isDirty).toBe(true);
    store().setGameCast('hero', null);
    expect(store().doc.game?.cast.hero).toBeUndefined();
  });

  it('casting is metadata: undo does not re-cast the game', () => {
    const layerId = store().doc.layers[0].id;
    store().setGameCast('good', layerId);
    store().undo(); // nothing to undo — cast survives
    expect(store().doc.game?.cast.good).toBe(layerId);
  });

  it('casting leaves settings untouched, so kid defaults still apply', () => {
    store().setGameCast('hero', store().doc.layers[0].id);
    expect(store().doc.game?.settings).toBeUndefined();
  });

  it('createCastLayer adds a named layer, makes it active and is undoable', () => {
    const id = store().createCastLayer('Hero');
    const doc = store().doc;
    expect(doc.layers).toHaveLength(2);
    expect(doc.layers[1].name).toBe('Hero');
    expect(store().activeLayerId).toBe(id);
    store().undo();
    expect(store().doc.layers).toHaveLength(1);
  });
});

describe('settings', () => {
  it('updates and clamps the difficulty knobs', () => {
    store().setGameSettings({ fallSpeed: 9999, lives: 0 });
    expect(store().doc.game?.settings?.fallSpeed).toBe(400);
    expect(store().doc.game?.settings?.lives).toBe(1);
    expect(store().doc.game?.settings?.spawnInterval).toBe(DEFAULT_GAME_SETTINGS.spawnInterval);
  });

  it('new documents start with no game setup (defaults apply)', () => {
    expect(store().doc.game).toBeUndefined();
  });
});

describe('run state', () => {
  it('startGame/stopGame flip gameRunning; switching modes stops the run', () => {
    store().startGame();
    expect(store().gameRunning).toBe(true);
    store().setMode('design');
    expect(store().gameRunning).toBe(false);
    store().startGame();
    store().stopGame();
    expect(store().gameRunning).toBe(false);
  });

  it("Play doesn't steal lastEditMode from the editor modes", () => {
    store().setMode('design');
    store().setMode('play');
    expect(store().lastEditMode).toBe('design');
    store().setMode('present');
    expect(store().lastEditMode).toBe('design');
  });

  it('a document saved in Play mode reopens in Draw', () => {
    store().setMode('play');
    const saved = store().doc;
    store().loadDocument(saved);
    expect(store().mode).toBe('draw');
    expect(store().doc.game).toEqual(saved.game);
  });
});

describe('high score', () => {
  it('records only beats, persisted per project id', () => {
    const docId = store().doc.id;
    expect(readHighScore(docId)).toBe(0);
    expect(store().recordHighScore(7)).toBe(true);
    expect(readHighScore(docId)).toBe(7);
    expect(store().recordHighScore(3)).toBe(false);
    expect(readHighScore(docId)).toBe(7);
    expect(store().recordHighScore(12)).toBe(true);
    expect(readHighScore(docId)).toBe(12);
  });

  it('scores are project-scoped', () => {
    store().recordHighScore(9);
    store().newDocument({ width: 800, height: 600 });
    expect(readHighScore(store().doc.id)).toBe(0);
  });
});
