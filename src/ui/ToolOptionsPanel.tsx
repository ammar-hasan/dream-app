/** Right panel, top half: options for the active tool. */

import { PALETTE } from '../engine/color';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

const SHOW_COLOR = new Set(['brush', 'pencil', 'line', 'rectangle', 'ellipse', 'fill', 'text']);
const SHOW_SIZE = new Set(['brush', 'pencil', 'eraser', 'line', 'rectangle', 'ellipse']);
const SHOW_OPACITY = new Set(['brush', 'line', 'rectangle', 'ellipse', 'fill', 'text']);

/** Tools with a usage hint; the text lives under `options.hint.<tool>`. */
const HINT_TOOLS = new Set(['select', 'move', 'eyedropper', 'crop', 'pan', 'zoom', 'fill', 'text']);

const FONT_CHOICES = [
  { key: 'font.sans', value: 'system-ui, sans-serif' },
  { key: 'font.serif', value: 'Georgia, serif' },
  { key: 'font.mono', value: 'ui-monospace, monospace' },
  { key: 'font.handwritten', value: 'cursive' },
];

export function ToolOptionsPanel() {
  const t = useT();
  const tool = useDreamStore((s) => s.tool);
  const settings = useDreamStore((s) => s.settings);
  const cropDraft = useDreamStore((s) => s.cropDraft);
  const setColor = useDreamStore((s) => s.setColor);
  const setSize = useDreamStore((s) => s.setSize);
  const setOpacity = useDreamStore((s) => s.setOpacity);
  const setFontSize = useDreamStore((s) => s.setFontSize);
  const setFontFamily = useDreamStore((s) => s.setFontFamily);

  return (
    <section className="panel tool-options" aria-label={t('options.title')}>
      <h2 className="panel-title">{t('options.title')}</h2>

      {HINT_TOOLS.has(tool) && <p className="tool-hint">{t(`options.hint.${tool}`)}</p>}

      {tool === 'crop' && (
        <div className="option-row crop-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!cropDraft}
            onClick={() => useDreamStore.getState().applyCrop()}
          >
            {t('options.applyCrop')}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!cropDraft}
            onClick={() => useDreamStore.getState().cancelCrop()}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {SHOW_COLOR.has(tool) && (
        <div className="option-row">
          <span className="option-label">{t('options.color')}</span>
          <div className="swatches">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch${settings.color === color ? ' active' : ''}`}
                style={{ background: color }}
                title={color}
                aria-label={t('options.colorSwatch', { color })}
                onClick={() => setColor(color)}
              />
            ))}
            <label className="swatch custom-swatch" title={t('options.customColor')}>
              <input
                type="color"
                value={settings.color}
                onChange={(e) => setColor(e.target.value)}
                aria-label={t('options.customColor')}
              />
            </label>
          </div>
        </div>
      )}

      {SHOW_SIZE.has(tool) && (
        <label className="option-row">
          <span className="option-label">{t('options.size')}</span>
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
          <span className="option-label">{t('options.opacity')}</span>
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
            <span className="option-label">{t('options.font')}</span>
            <select
              value={settings.fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="font-select"
            >
              {FONT_CHOICES.map((f) => (
                <option key={f.value} value={f.value}>
                  {t(f.key)}
                </option>
              ))}
            </select>
          </label>
          <label className="option-row">
            <span className="option-label">{t('options.textSize')}</span>
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
