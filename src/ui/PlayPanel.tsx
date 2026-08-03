/**
 * Play mode panel: pick a game template, then the casting couch. Each role
 * of the chosen template gets a layer dropdown plus "draw it now" — which
 * makes a named layer, casts it and lands you in Draw mode with the brush
 * ready. Below: the template's difficulty knobs and the project's best score.
 */

import {
  MAX_FALL_SPEED,
  MAX_LIVES,
  MAX_SPAWN_INTERVAL,
  MIN_FALL_SPEED,
  MIN_LIVES,
  MIN_SPAWN_INTERVAL,
} from '../game/core';
import { TEMPLATES, templateOf } from '../game/templates';
import type { GameTemplateId } from '../engine/types';
import type { SliderDef } from '../game/template';
import { readHighScore, useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';
import { CatchGameIcon, FlappyGameIcon, MazeGameIcon } from './icons';

const TEMPLATE_ICONS: Record<GameTemplateId, (p: Record<string, never>) => JSX.Element> = {
  catch: CatchGameIcon,
  flappy: FlappyGameIcon,
  maze: MazeGameIcon,
};

const SLIDER_RANGES: Record<SliderDef['setting'], { min: number; max: number; step: number }> = {
  fallSpeed: { min: MIN_FALL_SPEED, max: MAX_FALL_SPEED, step: 10 },
  spawnInterval: { min: MIN_SPAWN_INTERVAL, max: MAX_SPAWN_INTERVAL, step: 0.1 },
  lives: { min: MIN_LIVES, max: MAX_LIVES, step: 1 },
};

export function PlayPanel() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const template = templateOf(doc);
  const best = readHighScore(doc.id);
  const settings = { ...template.defaultSettings, ...doc.game?.settings };
  const cast = doc.game?.cast ?? {};

  /** "Draw it now": new named layer, cast into the role, brush in hand. */
  const drawItNow = (role: (typeof template.roles)[number]['role'], name: string) => {
    const store = useDreamStore.getState();
    const id = store.createCastLayer(name);
    store.setGameCast(role, id);
    store.setMode('draw');
    store.setTool('brush');
  };

  return (
    <section className="panel play-panel" aria-label={t('play.cast')}>
      <h2 className="panel-title">{t('play.pickTemplate')}</h2>
      <div className="play-templates" role="group" aria-label={t('play.pickTemplate')}>
        {TEMPLATES.map((meta) => {
          const Icon = TEMPLATE_ICONS[meta.id];
          const selected = meta.id === template.id;
          return (
            <button
              type="button"
              key={meta.id}
              className={`play-template-card${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={() => useDreamStore.getState().setGameTemplate(meta.id)}
            >
              <Icon />
              <span>{t(meta.nameKey)}</span>
            </button>
          );
        })}
      </div>

      <h2 className="panel-title">{t('play.cast')}</h2>
      <p className="tool-hint">{t('play.castHint')}</p>

      {template.roles.map(({ role, labelKey, nameKey }) => (
        <div className="option-row play-cast-row" key={role}>
          <span className="option-label">{t(labelKey)}</span>
          <select
            aria-label={t(labelKey)}
            value={cast[role] ?? ''}
            onChange={(e) => useDreamStore.getState().setGameCast(role, e.target.value || null)}
          >
            <option value="">
              {t(role === 'background' ? 'play.docBackground' : 'play.auto')}
            </option>
            {doc.layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
          {nameKey && (
            <button type="button" className="btn" onClick={() => drawItNow(role, t(nameKey))}>
              {t('play.drawIt')}
            </button>
          )}
        </div>
      ))}

      <h2 className="panel-title">{t('play.settings')}</h2>

      {template.sliders.length === 0 && <p className="tool-hint">{t('play.mazeNote')}</p>}

      {template.sliders.map(({ setting, labelKey }) => {
        const range = SLIDER_RANGES[setting];
        return (
          <label className="option-row" key={setting}>
            <span className="option-label">{t(labelKey)}</span>
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={settings[setting]}
              onChange={(e) =>
                useDreamStore.getState().setGameSettings({ [setting]: Number(e.target.value) })
              }
            />
            <span className="option-value">
              {setting === 'spawnInterval' ? `${settings[setting]}s` : settings[setting]}
            </span>
          </label>
        );
      })}

      <p className="tool-hint">{t('play.best', { score: best })}</p>
    </section>
  );
}
