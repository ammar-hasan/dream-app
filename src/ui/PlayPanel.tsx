/**
 * Play mode panel: pick a game template, then the casting couch. Each role
 * of the chosen template gets a layer dropdown plus "draw it now" — which
 * makes a named layer, casts it and lands you in Draw mode with the brush
 * ready. Below: the template's difficulty knobs and the project's best score.
 */

import { useState } from 'react';
import type { GameCast, GameTemplateId } from '../engine/types';
import {
  MAX_FALL_SPEED,
  MAX_LIVES,
  MAX_SPAWN_INTERVAL,
  MIN_FALL_SPEED,
  MIN_LIVES,
  MIN_SPAWN_INTERVAL,
} from '../game/core';
import { planGameFromPrompt } from '../game/prompt';
import { TEMPLATES, templateOf } from '../game/templates';
import type { SliderDef } from '../game/template';
import { readHighScore, useDreamStore } from '../store/dreamStore';
import { DictateButton } from './DictateButton';
import { useT } from './i18n';
import { CatchGameIcon, FlappyGameIcon, MazeGameIcon, PlatformerGameIcon } from './icons';

const TEMPLATE_ICONS: Record<GameTemplateId, (p: Record<string, never>) => JSX.Element> = {
  catch: CatchGameIcon,
  flappy: FlappyGameIcon,
  maze: MazeGameIcon,
  platformer: PlatformerGameIcon,
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
  const [gamePrompt, setGamePrompt] = useState('');
  const [madeTemplate, setMadeTemplate] = useState<GameTemplateId | null>(null);
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

  const makeGame = () => {
    const plan = planGameFromPrompt(gamePrompt, doc.layers, template.id);
    if (!plan) return;
    const store = useDreamStore.getState();
    store.setGameTemplate(plan.template);
    if (Object.keys(plan.settings).length > 0) store.setGameSettings(plan.settings);
    for (const role of Object.keys(plan.cast) as (keyof GameCast)[]) {
      const layerId = plan.cast[role];
      if (layerId) store.setGameCast(role, layerId);
    }
    setMadeTemplate(plan.template);
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

      <form
        className="play-maker"
        onSubmit={(event) => {
          event.preventDefault();
          makeGame();
        }}
      >
        <div className="play-maker-title">
          <label htmlFor="game-prompt">{t('play.makePrompt')}</label>
          <DictateButton
            onText={(text) => {
              setGamePrompt(text);
              setMadeTemplate(null);
            }}
          />
        </div>
        <div className="play-maker-row">
          <input
            id="game-prompt"
            value={gamePrompt}
            placeholder={t('play.makePlaceholder')}
            onChange={(event) => {
              setGamePrompt(event.target.value);
              setMadeTemplate(null);
            }}
          />
          <button type="submit" className="btn primary" disabled={!gamePrompt.trim()}>
            {t('play.makeButton')}
          </button>
        </div>
        <p className="tool-hint">{t('play.makeHint')}</p>
        {madeTemplate && (
          <p className="play-maker-ready" role="status">
            {t('play.makeReady', {
              game: t(
                TEMPLATES.find((candidate) => candidate.id === madeTemplate)?.nameKey ??
                  'play.nameCatch',
              ),
            })}
          </p>
        )}
      </form>

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
