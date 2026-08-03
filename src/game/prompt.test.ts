import { describe, expect, it } from 'vitest';
import type { Layer } from '../engine/types';
import { planGameFromPrompt } from './prompt';

const layers = [
  { id: 'rocket', name: 'Rocket' },
  { id: 'clouds', name: 'Clouds' },
  { id: 'cat', name: 'Cat' },
  { id: 'stars', name: 'Stars' },
  { id: 'rocks', name: 'Rocks' },
  { id: 'robot', name: 'Robot' },
] as Pick<Layer, 'id' | 'name'>[];

describe('planGameFromPrompt', () => {
  it('turns a flying request into a slow Flappy game and casts named layers', () => {
    expect(planGameFromPrompt('My Rocket flies through Clouds, nice and slow', layers)).toEqual({
      template: 'flappy',
      settings: { fallSpeed: 110 },
      cast: { hero: 'rocket', obstacle: 'clouds' },
    });
  });

  it('understands Catch roles in mention order and explicit lives', () => {
    expect(
      planGameFromPrompt('Make Cat catch Stars and avoid Rocks with four lives', layers),
    ).toEqual({
      template: 'catch',
      settings: { lives: 4 },
      cast: { hero: 'cat', good: 'stars', bad: 'rocks' },
    });
  });

  it('understands an Arabic maze request and easy difficulty', () => {
    expect(planGameFromPrompt('لعبة متاهة سهلة يستكشفها Robot', layers)).toEqual({
      template: 'maze',
      settings: { fallSpeed: 110, spawnInterval: 1.6, lives: 5 },
      cast: { hero: 'robot' },
    });
  });

  it('chooses the platformer for run-and-jump language', () => {
    expect(
      planGameFromPrompt('Cat should run and jump over Rocks to reach the flag', layers),
    ).toEqual({
      template: 'platformer',
      settings: {},
      cast: { hero: 'cat', obstacle: 'rocks' },
    });
  });

  it('combines difficulty phrases with later, more specific instructions', () => {
    expect(planGameFromPrompt('A hard fast catch game with many things and 3 lives', [])).toEqual({
      template: 'catch',
      settings: { fallSpeed: 280, spawnInterval: 0.7, lives: 3 },
      cast: {},
    });
  });

  it('keeps the selected template when no template language matches', () => {
    expect(planGameFromPrompt('Use my Robot with two shields', layers, 'flappy')).toEqual({
      template: 'flappy',
      settings: { lives: 2 },
      cast: { hero: 'robot' },
    });
  });

  it('rejects a blank request', () => {
    expect(planGameFromPrompt('   ', layers)).toBeNull();
  });
});
