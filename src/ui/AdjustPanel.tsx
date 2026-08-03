/**
 * Right panel: per-layer image adjustments and transforms (slice 2).
 *
 * Slider changes preview an editable layer effect. Apply stores only the
 * settings as one undoable change, preserving every original operation;
 * Cancel discards the session preview.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  adjustmentsEqual,
  DEFAULT_ADJUSTMENTS,
  FILTER_PRESETS,
  isIdentity,
  normalizeAdjustments,
  type Adjustments,
} from '../engine/filters';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

interface SliderDef {
  key: keyof Adjustments;
  min: number;
  max: number;
  unit?: string;
}

/** Slider labels live under `adjust.<key>` in the string table. */
const SLIDERS: SliderDef[] = [
  { key: 'brightness', min: -100, max: 100 },
  { key: 'contrast', min: -100, max: 100 },
  { key: 'saturation', min: -100, max: 100 },
  { key: 'hue', min: -180, max: 180, unit: '°' },
  { key: 'grayscale', min: 0, max: 100 },
  { key: 'sepia', min: 0, max: 100 },
  { key: 'invert', min: 0, max: 100 },
  { key: 'blur', min: 0, max: 20 },
  { key: 'sharpen', min: 0, max: 100 },
];

export function AdjustPanel() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const layer = doc.layers.find((l) => l.id === activeLayerId);
  const persisted = useMemo(() => normalizeAdjustments(layer?.adjustments), [layer?.adjustments]);
  const [draft, setDraft] = useState<{ layerId: string; adjustments: Adjustments } | null>(null);
  const adj = draft && draft.layerId === layer?.id ? draft.adjustments : persisted;
  const changed = !adjustmentsEqual(adj, persisted);

  const update = (adjustments: Adjustments) => {
    if (!layer || layer.locked) return;
    setDraft({ layerId: layer.id, adjustments });
  };

  // The document stays untouched until Apply; the canvas renders this session
  // value through the exact same layer compositor used after commit.
  useEffect(() => {
    const store = useDreamStore.getState();
    if (!layer || !changed) {
      if (store.adjustPreview) store.setAdjustPreview(null);
      return;
    }
    store.setAdjustPreview({ layerId: layer.id, adjustments: adj });
  }, [adj, changed, layer]);

  // Switching layers or unmounting discards any in-progress preview.
  useEffect(() => {
    setDraft(null);
    return () => useDreamStore.getState().setAdjustPreview(null);
  }, [activeLayerId]);

  if (!layer || layer.operations.length === 0) return null;

  const store = useDreamStore.getState;
  const apply = () => {
    if (!layer || layer.locked || !changed) return;
    store().setLayerAdjustments(layer.id, adj);
    setDraft(null);
  };

  const cancel = () => {
    store().setAdjustPreview(null);
    setDraft(null);
  };

  return (
    <section className="panel adjust-panel" aria-label={t('adjust.title')}>
      <h2 className="panel-title">
        {t('adjust.title')}
        <span
          className="panel-badge"
          tabIndex={0}
          aria-label={t('adjust.editableHint')}
          data-tooltip={t('adjust.editableHint')}
        >
          {t('adjust.editable')}
        </span>
      </h2>

      <div className="option-row transform-actions">
        <button
          type="button"
          className="btn"
          aria-label={t('adjust.flipH')}
          disabled={layer.locked}
          onClick={() => store().flipLayer('horizontal')}
          data-tooltip={t('adjust.flipHTitle')}
        >
          {t('adjust.flipH')}
        </button>
        <button
          type="button"
          className="btn"
          aria-label={t('adjust.flipV')}
          disabled={layer.locked}
          onClick={() => store().flipLayer('vertical')}
          data-tooltip={t('adjust.flipVTitle')}
        >
          {t('adjust.flipV')}
        </button>
        <button
          type="button"
          className="btn"
          aria-label={t('adjust.rotateCcwTitle')}
          disabled={layer.locked}
          onClick={() => store().rotateLayer('ccw')}
          data-tooltip={t('adjust.rotateCcwTitle')}
        >
          ⟲ 90°
        </button>
        <button
          type="button"
          className="btn"
          aria-label={t('adjust.rotateCwTitle')}
          disabled={layer.locked}
          onClick={() => store().rotateLayer('cw')}
          data-tooltip={t('adjust.rotateCwTitle')}
        >
          ⟳ 90°
        </button>
      </div>

      <>
        <div className="option-row preset-row">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="btn"
              disabled={layer.locked}
              aria-pressed={adjustmentsEqual(adj, preset.adjustments)}
              onClick={() => update({ ...preset.adjustments })}
            >
              {t(`adjust.preset.${preset.id}`)}
            </button>
          ))}
        </div>

        {SLIDERS.map(({ key, min, max, unit }) => (
          <label className="option-row" key={key}>
            <span className="option-label">{t(`adjust.${key}`)}</span>
            <input
              type="range"
              min={min}
              max={max}
              value={adj[key]}
              disabled={layer.locked}
              onChange={(e) => update({ ...adj, [key]: Number(e.target.value) })}
            />
            <span className="option-value">
              {adj[key]}
              {unit ?? ''}
            </span>
          </label>
        ))}

        <div className="option-row adjust-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!changed || layer.locked}
            onClick={apply}
          >
            {t('common.apply')}
          </button>
          <button type="button" className="btn" disabled={!changed} onClick={cancel}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn"
            disabled={isIdentity(adj) || layer.locked}
            onClick={() => update({ ...DEFAULT_ADJUSTMENTS })}
          >
            {t('common.reset')}
          </button>
        </div>
      </>
    </section>
  );
}
