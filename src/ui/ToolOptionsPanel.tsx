/** Right panel, top half: options for the active tool. */

import { PALETTE } from '../engine/color';
import { useDreamStore } from '../store/dreamStore';

const SHOW_COLOR = new Set(['brush', 'pencil', 'line', 'rectangle', 'ellipse', 'fill', 'text']);
const SHOW_SIZE = new Set(['brush', 'pencil', 'eraser', 'line', 'rectangle', 'ellipse']);
const SHOW_OPACITY = new Set(['brush', 'line', 'rectangle', 'ellipse', 'fill', 'text']);

const TOOL_HINTS: Record<string, string> = {
  select:
    'Click to select, drag to move. Shift-click adds to the selection; drag on empty canvas for a marquee. Handles scale and rotate.',
  move: 'Drag to move the active layer’s content.',
  eyedropper: 'Click anywhere on the canvas to pick that color.',
  crop: 'Drag a rectangle, then Apply (or press Enter). Esc cancels.',
  pan: 'Drag to move the canvas. You can also hold Space with any tool.',
  zoom: 'Click to zoom in. Alt+click to zoom out.',
  fill: 'Click a region to fill it with the current color.',
  text: 'Click on the canvas, type, then press Enter to place the text.',
};

const FONT_CHOICES = [
  { label: 'Sans', value: 'system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'ui-monospace, monospace' },
  { label: 'Handwritten', value: 'cursive' },
];

export function ToolOptionsPanel() {
  const tool = useDreamStore((s) => s.tool);
  const settings = useDreamStore((s) => s.settings);
  const cropDraft = useDreamStore((s) => s.cropDraft);
  const setColor = useDreamStore((s) => s.setColor);
  const setSize = useDreamStore((s) => s.setSize);
  const setOpacity = useDreamStore((s) => s.setOpacity);
  const setFontSize = useDreamStore((s) => s.setFontSize);
  const setFontFamily = useDreamStore((s) => s.setFontFamily);

  return (
    <section className="panel tool-options" aria-label="Tool options">
      <h2 className="panel-title">Options</h2>

      {TOOL_HINTS[tool] && <p className="tool-hint">{TOOL_HINTS[tool]}</p>}

      {tool === 'crop' && (
        <div className="option-row crop-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!cropDraft}
            onClick={() => useDreamStore.getState().applyCrop()}
          >
            Apply crop
          </button>
          <button
            type="button"
            className="btn"
            disabled={!cropDraft}
            onClick={() => useDreamStore.getState().cancelCrop()}
          >
            Cancel
          </button>
        </div>
      )}

      {SHOW_COLOR.has(tool) && (
        <div className="option-row">
          <span className="option-label">Color</span>
          <div className="swatches">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch${settings.color === color ? ' active' : ''}`}
                style={{ background: color }}
                title={color}
                aria-label={`Color ${color}`}
                onClick={() => setColor(color)}
              />
            ))}
            <label className="swatch custom-swatch" title="Custom color">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Custom color"
              />
            </label>
          </div>
        </div>
      )}

      {SHOW_SIZE.has(tool) && (
        <label className="option-row">
          <span className="option-label">Size</span>
          <input
            type="range"
            min={1}
            max={64}
            value={settings.size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <span className="option-value">{settings.size}px</span>
        </label>
      )}

      {SHOW_OPACITY.has(tool) && (
        <label className="option-row">
          <span className="option-label">Opacity</span>
          <input
            type="range"
            min={5}
            max={100}
            value={Math.round(settings.opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
          />
          <span className="option-value">{Math.round(settings.opacity * 100)}%</span>
        </label>
      )}

      {tool === 'text' && (
        <>
          <label className="option-row">
            <span className="option-label">Font</span>
            <select
              value={settings.fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="font-select"
            >
              {FONT_CHOICES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="option-row">
            <span className="option-label">Text size</span>
            <input
              type="range"
              min={10}
              max={120}
              value={settings.fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
            <span className="option-value">{settings.fontSize}px</span>
          </label>
        </>
      )}
    </section>
  );
}
