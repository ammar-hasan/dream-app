/** New document dialog: presets + custom size + background. */

import { useState } from 'react';
import { useDreamStore } from '../store/dreamStore';

const PRESETS = [
  { label: '1024 × 768', width: 1024, height: 768 },
  { label: '800 × 600', width: 800, height: 600 },
  { label: '1280 × 720', width: 1280, height: 720 },
  { label: '1920 × 1080', width: 1920, height: 1080 },
  { label: '1024 × 1024', width: 1024, height: 1024 },
];

const MAX_DIMENSION = 4096;

export function NewDocumentDialog({ onClose }: { onClose: () => void }) {
  const newDocument = useDreamStore((s) => s.newDocument);
  const [name, setName] = useState('Untitled');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(768);
  const [background, setBackground] = useState('#ffffff');

  const clampDim = (v: number) => Math.max(1, Math.min(MAX_DIMENSION, Math.round(v) || 1));

  const create = () => {
    newDocument({
      name: name.trim() || 'Untitled',
      width: clampDim(width),
      height: clampDim(height),
      background,
    });
    onClose();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="New document"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">New document</h2>

        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <div className="field">
          <span>Presets</span>
          <div className="preset-grid">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`btn preset${width === p.width && height === p.height ? ' active' : ''}`}
                onClick={() => {
                  setWidth(p.width);
                  setHeight(p.height);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Width</span>
            <input
              type="number"
              min={1}
              max={MAX_DIMENSION}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Height</span>
            <input
              type="number"
              min={1}
              max={MAX_DIMENSION}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Background</span>
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              aria-label="Background color"
            />
          </label>
        </div>

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={create}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
