/**
 * The shared Play-mode template contract. Each game is a self-contained
 * module in `game/templates/` implementing this interface: metadata for the
 * template picker and casting panel, plus the pure run functions
 * (create → start → tick). The registry of available templates lives in
 * `game/templates.ts`. All framework-free, like the rest of `game/`.
 */

import type { GameCast, GameSettings, GameTemplateId } from '../engine/types';
import type { Rng } from './core';

/** A casting row for the Play panel: which cast slot, with i18n keys. */
export interface CastRoleDef {
  role: keyof GameCast;
  /** Label key for the role's dropdown row. */
  labelKey: string;
  /** Short name key for the "Draw it now" layer; omit to hide that button. */
  nameKey?: string;
}

/** A difficulty slider the template shows, mapped onto a shared knob. */
export interface SliderDef {
  setting: keyof GameSettings;
  labelKey: string;
}

/** Picker/casting metadata shared by every template. */
export interface GameTemplateMeta {
  id: GameTemplateId;
  /** i18n key for the template's friendly name. */
  nameKey: string;
  /** i18n key for the one-line hint on the ready screen. */
  hintKey: string;
  /** Cast roles this template needs, in panel order. */
  roles: readonly CastRoleDef[];
  /** Difficulty sliders (empty = no knobs — the maze tunes itself). */
  sliders: readonly SliderDef[];
  /** Defaults when the document stores no settings yet. */
  defaultSettings: GameSettings;
  /** Little Dreamer defaults (gentler); used when kid mode has no stored knobs. */
  kidSettings: GameSettings;
}

/** The full contract: metadata + the pure run functions. */
export interface GameTemplate<S, I> extends GameTemplateMeta {
  /** Fresh state for a run. `kid` softens templates that care (maze size);
   * `rng` seeds anything generated up front (the maze). */
  createGame(width: number, height: number, settings: GameSettings, kid?: boolean, rng?: Rng): S;
  /** Press start: ready → countdown. A no-op in any other phase. */
  startRun(state: S): S;
  /** Advance by `dtMs`. Pure: same (state, input, dt, rng) in → same out. */
  tick(state: S, input: I, dtMs: number, rng: Rng): S;
}
