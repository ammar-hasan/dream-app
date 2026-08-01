/**
 * Right panel: per-layer image adjustments and transforms (slice 2).
 *
 * The active layer is rasterized onto a scratch canvas; slider changes run
 * the pure engine filters over that buffer and show the result as a live
 * preview (store.adjustPreview replaces the layer in the viewport). Apply
 * bakes the filtered raster into the layer as one undoable command; Cancel
 * discards everything. The engine itself never touches the DOM — the canvas
 * dance lives here.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  applyAdjustments,
  DEFAULT_ADJUSTMENTS,
  FILTER_PRESETS,
  isIdentity,
  type Adjustments,
} from '../engine/filters';
import type { Layer } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { rasterizeLayer } from './rasterize';

interface SliderDef {
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
  unit?: string;
}

const SLIDERS: SliderDef[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'hue', label: 'Hue', min: -180, max: 180, unit: '°' },
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100 },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100 },
  { key: 'invert', label: 'Invert', min: 0, max: 100 },
  { key: 'blur', label: 'Blur', min: 0, max: 20 },
  { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
];

function isRasterCapable(layer: Layer): boolean {
  return layer.operations.some((op) => op.kind === 'image' || op.kind === 'fill');
}

export function AdjustPanel() {
  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const layer = doc.layers.find((l) => l.id === activeLayerId);
  const [adj, setAdj] = useState<Adjustments>({ ...DEFAULT_ADJUSTMENTS });

  const rasterCapable = layer ? isRasterCapable(layer) : false;

  // Base raster for previews; recomputed whenever the layer content changes.
  const base = useMemo(
    () => (layer && rasterCapable ? rasterizeLayer(layer, doc.width, doc.height) : null),
    [layer, rasterCapable, doc.width, doc.height],
  );

  // Push the live preview into the store; identity adjustments show the original.
  useEffect(() => {
    const store = useDreamStore.getState();
    if (!base || !layer || isIdentity(adj)) {
      if (store.adjustPreview) store.setAdjustPreview(null);
      return;
    }
    store.setAdjustPreview({ layerId: layer.id, buffer: applyAdjustments(base, adj) });
  }, [base, adj, layer]);

  // Switching layers or unmounting discards any in-progress preview.
  useEffect(() => {
    setAdj({ ...DEFAULT_ADJUSTMENTS });
    return () => useDreamStore.getState().setAdjustPreview(null);
  }, [activeLayerId]);

  if (!layer || layer.operations.length === 0) return null;

  const store = useDreamStore.getState;
  const identity = isIdentity(adj);

  const apply = () => {
    if (!base) return;
    store().applyLayerRaster(applyAdjustments(base, adj));
    setAdj({ ...DEFAULT_ADJUSTMENTS });
  };

  const cancel = () => {
    store().setAdjustPreview(null);
    setAdj({ ...DEFAULT_ADJUSTMENTS });
  };

  return (
    <section className="panel adjust-panel" aria-label="Adjust">
      <h2 className="panel-title">Adjust</h2>

      <div className="option-row transform-actions">
        <button
          type="button"
          className="btn"
          onClick={() => store().flipLayer('horizontal')}
          title="Flip layer horizontally"
        >
          Flip H
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => store().flipLayer('vertical')}
          title="Flip layer vertically"
        >
          Flip V
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => store().rotateLayer('ccw')}
          title="Rotate layer 90° counter-clockwise"
        >
          ⟲ 90°
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => store().rotateLayer('cw')}
          title="Rotate layer 90° clockwise"
        >
          ⟳ 90°
        </button>
      </div>

      {rasterCapable && (
        <>
          <div className="option-row preset-row">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="btn"
                onClick={() => setAdj({ ...preset.adjustments })}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {SLIDERS.map(({ key, label, min, max, unit }) => (
            <label className="option-row" key={key}>
              <span className="option-label">{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                value={adj[key]}
                onChange={(e) => setAdj({ ...adj, [key]: Number(e.target.value) })}
              />
              <span className="option-value">
                {adj[key]}
                {unit ?? ''}
              </span>
            </label>
          ))}

          <div className="option-row adjust-actions">
            <button type="button" className="btn primary" disabled={identity} onClick={apply}>
              Apply
            </button>
            <button type="button" className="btn" disabled={identity} onClick={cancel}>
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              disabled={identity}
              onClick={() => setAdj({ ...DEFAULT_ADJUSTMENTS })}
            >
              Reset
            </button>
          </div>
        </>
      )}
    </section>
  );
}
