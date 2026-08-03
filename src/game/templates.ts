/**
 * Play-mode template registry: every game the picker can offer, plus the
 * document-aware helpers (which template does this doc run, and with which
 * settings). The template modules themselves live in `game/templates/`.
 */

import type { DreamDocument, GameSettings } from '../engine/types';
import { gameSetupOf } from './core';
import type { GameTemplateMeta } from './template';
import { catchMeta, catchTemplate } from './templates/catch';
import { flappyMeta, flappyTemplate } from './templates/flappy';
import { mazeMeta, mazeTemplate } from './templates/maze';
import { platformerMeta, platformerTemplate } from './templates/platformer';

/** Picker order: the original first, then the new friends. */
export const TEMPLATES: readonly GameTemplateMeta[] = [
  catchMeta,
  flappyMeta,
  mazeMeta,
  platformerMeta,
];

export { catchTemplate, flappyTemplate, mazeTemplate, platformerTemplate };

/** The template a document runs; old saves and unknown ids fall back to Catch!. */
export function templateOf(doc: DreamDocument): GameTemplateMeta {
  const id = gameSetupOf(doc).template;
  return TEMPLATES.find((template) => template.id === id) ?? catchMeta;
}

/**
 * Settings for a run: the template's own defaults, the gentler kid defaults
 * when Little Dreamer mode has no stored knobs yet, then any stored knobs.
 */
export function templateSettings(doc: DreamDocument, kid: boolean): GameSettings {
  const meta = templateOf(doc);
  const base = kid && !doc.game?.settings ? meta.kidSettings : meta.defaultSettings;
  return { ...base, ...doc.game?.settings };
}
