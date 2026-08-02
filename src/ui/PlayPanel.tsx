/**
 * Play mode panel: the casting couch. Each game role (hero, good thing, bad
 * thing, background) gets a layer dropdown plus "draw it now" — which makes a
 * named layer, casts it and lands you in Draw mode with the brush ready.
 * Below: the difficulty knobs and the project's best score.
 */

import {
  gameSetupOf,
  MAX_FALL_SPEED,
  MAX_LIVES,
  MAX_SPAWN_INTERVAL,
  MIN_FALL_SPEED,
  MIN_LIVES,
  MIN_SPAWN_INTERVAL,
} from '../game/core';
import type { GameCast } from '../engine/types';
import { readHighScore, useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

const ROLES: { role: keyof GameCast; key: string; shortKey?: string }[] = [
  { role: 'hero', key: 'play.hero', shortKey: 'play.roleHero' },
  { role: 'good', key: 'play.good', shortKey: 'play.roleGood' },
  { role: 'bad', key: 'play.bad', shortKey: 'play.roleBad' },
  { role: 'background', key: 'play.background' },
];

export function PlayPanel() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const setup = gameSetupOf(doc);
  const best = readHighScore(doc.id);

  /** "Draw it now": new named layer, cast into the role, brush in hand. */
  const drawItNow = (role: keyof GameCast, name: string) => {
    const store = useDreamStore.getState();
    const id = store.createCastLayer(name);
    store.setGameCast(role, id);
    store.setMode('draw');
    store.setTool('brush');
  };

  return (
    <section className="panel play-panel" aria-label={t('play.cast')}>
      <h2 className="panel-title">{t('play.cast')}</h2>
      <p className="tool-hint">{t('play.castHint')}</p>

      {ROLES.map(({ role, key, shortKey }) => (
        <div className="option-row play-cast-row" key={role}>
          <span className="option-label">{t(key)}</span>
          <select
            aria-label={t(key)}
            value={setup.cast[role] ?? ''}
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
          {shortKey && (
            <button type="button" className="btn" onClick={() => drawItNow(role, t(shortKey))}>
              {t('play.drawIt')}
            </button>
          )}
        </div>
      ))}

      <h2 className="panel-title">{t('play.settings')}</h2>

      <label className="option-row">
        <span className="option-label">{t('play.fallSpeed')}</span>
        <input
          type="range"
          min={MIN_FALL_SPEED}
          max={MAX_FALL_SPEED}
          step={10}
          value={setup.settings.fallSpeed}
          onChange={(e) =>
            useDreamStore.getState().setGameSettings({ fallSpeed: Number(e.target.value) })
          }
        />
        <span className="option-value">{setup.settings.fallSpeed}</span>
      </label>

      <label className="option-row">
        <span className="option-label">{t('play.spawnRate')}</span>
        <input
          type="range"
          min={MIN_SPAWN_INTERVAL}
          max={MAX_SPAWN_INTERVAL}
          step={0.1}
          value={setup.settings.spawnInterval}
          onChange={(e) =>
            useDreamStore.getState().setGameSettings({ spawnInterval: Number(e.target.value) })
          }
        />
        <span className="option-value">{setup.settings.spawnInterval}s</span>
      </label>

      <label className="option-row">
        <span className="option-label">{t('play.lives')}</span>
        <input
          type="range"
          min={MIN_LIVES}
          max={MAX_LIVES}
          value={setup.settings.lives}
          onChange={(e) =>
            useDreamStore.getState().setGameSettings({ lives: Number(e.target.value) })
          }
        />
        <span className="option-value">{setup.settings.lives}</span>
      </label>

      <p className="tool-hint">{t('play.best', { score: best })}</p>
    </section>
  );
}
