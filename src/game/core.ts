/**
 * Play mode: the shared game kit. Framework-free and pure — no DOM, no
 * React, no imports from store/ or ui/ — so every game template is
 * unit-testable in Node with a seeded RNG.
 *
 * This module holds what all templates share: the seeded RNG, the persisted
 * settings knobs (each template interprets them its own way), the resolved
 * document setup, the run phases and the juice timers (countdown, score
 * pops, screen shake). The templates themselves live in `game/templates/`
 * behind the shared `GameTemplate` contract (`game/template.ts`), with the
 * registry in `game/templates.ts`.
 */

import { mulberry32 } from '../engine/spray';
import type { DreamDocument, GameCast, GameSettings, GameTemplateId } from '../engine/types';

export type Rng = () => number;

/** A deterministic RNG for a fresh run; the seed makes runs reproducible. */
export function gameRng(seed: number): Rng {
  return mulberry32(seed);
}

export const MIN_FALL_SPEED = 60;
export const MAX_FALL_SPEED = 400;
export const MIN_SPAWN_INTERVAL = 0.4;
export const MAX_SPAWN_INTERVAL = 2.5;
export const MIN_LIVES = 1;
export const MAX_LIVES = 9;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  fallSpeed: 180,
  spawnInterval: 1.1,
  lives: 3,
};

/** Little Dreamer defaults: slower, sparser, more forgiving. */
export const KID_GAME_SETTINGS: GameSettings = {
  fallSpeed: 110,
  spawnInterval: 1.6,
  lives: 5,
};

/** Every template id a document can name. */
export const GAME_TEMPLATE_IDS: readonly GameTemplateId[] = [
  'catch',
  'flappy',
  'maze',
  'platformer',
];

export function isGameTemplateId(id: unknown): id is GameTemplateId {
  return typeof id === 'string' && (GAME_TEMPLATE_IDS as readonly string[]).includes(id);
}

/** Game setup with every default filled in (what the game actually runs). */
export interface ResolvedGameSetup {
  template: GameTemplateId;
  cast: GameCast;
  settings: GameSettings;
}

/** The document's game setup with defaults filled in (old saves have none). */
export function gameSetupOf(doc: DreamDocument): ResolvedGameSetup {
  return {
    template: isGameTemplateId(doc.game?.template) ? doc.game.template : 'catch',
    cast: { ...doc.game?.cast },
    settings: { ...DEFAULT_GAME_SETTINGS, ...doc.game?.settings },
  };
}

export function clampGameSettings(settings: GameSettings): GameSettings {
  return {
    fallSpeed: Math.min(MAX_FALL_SPEED, Math.max(MIN_FALL_SPEED, Math.round(settings.fallSpeed))),
    spawnInterval: Math.min(
      MAX_SPAWN_INTERVAL,
      Math.max(MIN_SPAWN_INTERVAL, Math.round(settings.spawnInterval * 10) / 10),
    ),
    lives: Math.min(MAX_LIVES, Math.max(MIN_LIVES, Math.round(settings.lives))),
  };
}

export type GamePhase = 'ready' | 'countdown' | 'playing' | 'over';

/** A floating "+1" / "-1" that rises and fades; `ageMs` drives the render. */
export interface ScorePop {
  id: number;
  x: number;
  y: number;
  text: string;
  ageMs: number;
}

export const COUNTDOWN_MS = 2400; // "3… 2… 1…" at ~800ms per beat
export const POP_MS = 800;
export const SHAKE_MS = 320;
