/** Tests for the template registry: picker list, document resolution, settings. */

import { describe, expect, it } from 'vitest';
import { createDocument } from '../engine/document';
import type { GameCast, GameTemplateId } from '../engine/types';
import { DEFAULT_GAME_SETTINGS, GAME_TEMPLATE_IDS, KID_GAME_SETTINGS } from './core';
import {
  catchTemplate,
  flappyTemplate,
  mazeTemplate,
  templateOf,
  templateSettings,
  TEMPLATES,
} from './templates';

describe('TEMPLATES registry', () => {
  it('lists exactly the three templates, in picker order, one per id', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['catch', 'flappy', 'maze']);
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual([...GAME_TEMPLATE_IDS].sort());
  });

  it('every template has a name, a hint and at least a hero role', () => {
    for (const meta of TEMPLATES) {
      expect(meta.nameKey).toMatch(/^play\./);
      expect(meta.hintKey).toMatch(/^play\./);
      expect(meta.roles.some((r) => r.role === 'hero')).toBe(true);
    }
  });

  it('roles reference real cast slots and slider defs real knobs', () => {
    const castKeys: (keyof GameCast)[] = ['hero', 'good', 'bad', 'obstacle', 'background'];
    for (const meta of TEMPLATES) {
      for (const role of meta.roles) expect(castKeys).toContain(role.role);
      for (const slider of meta.sliders) {
        expect(['fallSpeed', 'spawnInterval', 'lives']).toContain(slider.setting);
      }
    }
  });

  it('the template modules satisfy the shared contract (create → start → tick)', () => {
    const catching = catchTemplate.startRun(
      catchTemplate.createGame(800, 600, DEFAULT_GAME_SETTINGS),
    );
    expect(catchTemplate.tick(catching, { left: false, right: false }, 100, () => 0.5).phase).toBe(
      'countdown',
    );
    const flying = flappyTemplate.startRun(
      flappyTemplate.createGame(800, 600, DEFAULT_GAME_SETTINGS),
    );
    expect(flappyTemplate.tick(flying, { flap: false }, 100, () => 0.5).phase).toBe('countdown');
    const maze = mazeTemplate.startRun(
      mazeTemplate.createGame(800, 600, DEFAULT_GAME_SETTINGS, false, () => 0.5),
    );
    expect(
      mazeTemplate.tick(maze, { left: false, right: false, up: false, down: false }, 100, () => 0.5)
        .phase,
    ).toBe('countdown');
  });
});

describe('templateOf', () => {
  it('old documents (no game setup) resolve to Catch!', () => {
    expect(templateOf(createDocument({ width: 100, height: 100 })).id).toBe('catch');
  });

  it('a stored template id resolves to its template', () => {
    const doc = {
      ...createDocument({ width: 100, height: 100 }),
      game: { template: 'flappy' as GameTemplateId, cast: {} },
    };
    expect(templateOf(doc).id).toBe('flappy');
    doc.game.template = 'maze';
    expect(templateOf(doc).id).toBe('maze');
  });

  it('an unknown stored id falls back to Catch!', () => {
    const doc = {
      ...createDocument({ width: 100, height: 100 }),
      game: { template: 'platformer' as GameTemplateId, cast: {} },
    };
    expect(templateOf(doc).id).toBe('catch');
  });
});

describe('templateSettings', () => {
  it('uses the template defaults for adults, kid defaults in kid mode', () => {
    const doc = createDocument({ width: 100, height: 100 });
    expect(templateSettings(doc, false)).toEqual(DEFAULT_GAME_SETTINGS);
    expect(templateSettings(doc, true)).toEqual(KID_GAME_SETTINGS);
    const flappyDoc = {
      ...doc,
      game: { template: 'flappy' as GameTemplateId, cast: {} },
    };
    expect(templateSettings(flappyDoc, false)).toEqual(flappyTemplate.defaultSettings);
    expect(templateSettings(flappyDoc, true)).toEqual(flappyTemplate.kidSettings);
  });

  it('stored knobs win over both default sets', () => {
    const doc = {
      ...createDocument({ width: 100, height: 100 }),
      game: {
        template: 'flappy' as GameTemplateId,
        cast: {},
        settings: { fallSpeed: 200, spawnInterval: 1, lives: 2 },
      },
    };
    expect(templateSettings(doc, true).fallSpeed).toBe(200);
    expect(templateSettings(doc, true).lives).toBe(2);
  });
});
