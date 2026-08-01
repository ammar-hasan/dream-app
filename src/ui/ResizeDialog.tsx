/** Resize document dialog: new width/height with a keep-aspect toggle. */

import { useState } from 'react';
import { useDreamStore } from '../store/dreamStore';

const MAX_DIMENSION = 4096;

export function ResizeDialog({ onClose }: { onClose: () => void }) {
  const doc = useDreamStore((s) => s.doc);
  const [width, setWidth] = useState(doc.width);
  const [height, setHeight] = useState(doc.height);
  const [keepAspect, setKeepAspect] = useState(true);

  const clampDim = (v: number) => Math.max(1, Math.min(MAX_DIMENSION, Math.round(v) || 1));
  const aspect = doc.width / doc.height;

  const changeWidth = (v: number) => {
    setWidth(v);
    if (keepAspect) setHeight(Math.round(v / aspect));
  };
  const changeHeight = (v: number) => {
    setHeight(v);
    if (keepAspect) setWidth(Math.round(v * aspect));
  };

  const resize = () => {
    // Content is scaled to fit (nearest-neighbor for raster pixels).
    useDreamStore.getState().resizeDocument(clampDim(width), clampDim(height));
    onClose();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Resize document"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">Resize document</h2>
        <p className="tool-hint">
          Current size: {doc.width} × {doc.height}. Content is scaled to fit.
        </p>

        <div className="field-row">
          <label className="field">
            <span>Width</span>
            <input
              type="number"
              min={1}
              max={MAX_DIMENSION}
              value={width}
              onChange={(e) => changeWidth(Number(e.target.value))}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Height</span>
            <input
              type="number"
              min={1}
              max={MAX_DIMENSION}
              value={height}
              onChange={(e) => changeHeight(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={keepAspect}
            onChange={(e) => setKeepAspect(e.target.checked)}
          />
          <span>Keep aspect ratio</span>
        </label>

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={resize}>
            Resize
          </button>
        </div>
      </div>
    </div>
  );
}
