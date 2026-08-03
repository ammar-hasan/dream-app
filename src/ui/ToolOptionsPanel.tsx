/** Right panel, top half: options for the active tool. */

import { useEffect } from 'react';
import { PALETTE } from '../engine/color';
import { SYMMETRY_TOOLS, type SymmetryMode } from '../engine/symmetry';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { useT } from './i18n';
import { StampPicker } from './StampPicker';

const SHOW_COLOR = new Set([
  'brush',
  'pencil',
  'spray',
  'line',
  'rectangle',
  'ellipse',
  'fill',
  'text',
]);
const SHOW_SIZE = new Set(['brush', 'pencil', 'spray', 'eraser', 'line', 'rectangle', 'ellipse']);
const SHOW_OPACITY = new Set(['brush', 'spray', 'line', 'rectangle', 'ellipse', 'fill', 'text']);

/** Tools with a usage hint; the text lives under `options.hint.<tool>`. */
const HINT_TOOLS = new Set([
  'select',
  'move',
  'eyedropper',
  'crop',
  'pan',
  'zoom',
  'fill',
  'text',
  'wand',
  'lasso',
  'link',
  'stamp',
]);

const SYMMETRY_MODES: { value: SymmetryMode; key: string }[] = [
  { value: 'off', key: 'options.symmetryOff' },
  { value: 'vertical', key: 'options.symmetryVertical' },
  { value: 'horizontal', key: 'options.symmetryHorizontal' },
  { value: 'quad', key: 'options.symmetryQuad' },
];

const FONT_CHOICES = [
  { key: 'font.sans', value: 'system-ui, sans-serif' },
  { key: 'font.serif', value: 'Georgia, serif' },
  { key: 'font.mono', value: 'ui-monospace, monospace' },
  { key: 'font.handwritten', value: 'cursive' },
  {
    key: 'font.persian',
    value: '"Noto Nastaliq Urdu", "Noto Naskh Arabic", Tahoma, serif',
  },
];

const BRUSH_PRESETS = [
  { key: 'options.brushPreset.ink', size: 4, opacity: 1, style: 'round' },
  { key: 'options.brushPreset.marker', size: 18, opacity: 0.55, style: 'round' },
  { key: 'options.brushPreset.paint', size: 32, opacity: 0.85, style: 'round' },
  { key: 'options.brushPreset.calligraphy', size: 16, opacity: 1, style: 'calligraphy' },
] as const;

export function ToolOptionsPanel() {
  const t = useT();
  const tool = useDreamStore((s) => s.tool);
  const settings = useDreamStore((s) => s.settings);
  const cropDraft = useDreamStore((s) => s.cropDraft);
  const setColor = useDreamStore((s) => s.setColor);
  const setSize = useDreamStore((s) => s.setSize);
  const setBrushStyle = useDreamStore((s) => s.setBrushStyle);
  const setLineStyle = useDreamStore((s) => s.setLineStyle);
  const setOpacity = useDreamStore((s) => s.setOpacity);
  const setFontSize = useDreamStore((s) => s.setFontSize);
  const setFontFamily = useDreamStore((s) => s.setFontFamily);
  const symmetry = useDreamStore((s) => s.symmetry);
  const wandDraft = useDreamStore((s) => s.wandDraft);
  const wandTolerance = useDreamStore((s) => s.wandTolerance);
  const recentColors = useUiPrefs((s) => s.recentColors);

  // Remember the color once it settles (debounced so dragging the native
  // color picker doesn't flood the recents row with in-between values).
  useEffect(() => {
    const timer = setTimeout(() => useUiPrefs.getState().rememberColor(settings.color), 600);
    return () => clearTimeout(timer);
  }, [settings.color]);

  const swatchButton = (color: string) => (
    <button
      key={color}
      type="button"
      className={`swatch${settings.color === color ? ' active' : ''}`}
      style={{ background: color }}
      data-tooltip={color}
      aria-label={t('options.colorSwatch', { color })}
      onClick={() => setColor(color)}
    />
  );

  return (
    <section className="panel tool-options" aria-label={t('options.title')}>
      <h2 className="panel-title">{t('options.title')}</h2>

      {HINT_TOOLS.has(tool) && <p className="tool-hint">{t(`options.hint.${tool}`)}</p>}

      {tool === 'stamp' && <StampPicker />}

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
        <>
          <div className="option-row">
            <span className="option-label">{t('options.color')}</span>
            <div className="swatches">
              {PALETTE.map(swatchButton)}
              <label className="swatch custom-swatch" data-tooltip={t('options.customColor')}>
                <input
                  type="color"
                  value={settings.color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label={t('options.customColor')}
                />
              </label>
            </div>
          </div>
          {recentColors.length > 0 && (
            <div className="option-row">
              <span className="option-label">{t('options.recent')}</span>
              <div className="swatches">{recentColors.map(swatchButton)}</div>
            </div>
          )}
        </>
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

      {tool === 'brush' && (
        <>
          <div className="option-row brush-presets-row">
            <span className="option-label">{t('options.brushPresets')}</span>
            <div className="brush-presets" role="group" aria-label={t('options.brushPresets')}>
              {BRUSH_PRESETS.map((preset) => {
                const active =
                  settings.size === preset.size &&
                  settings.opacity === preset.opacity &&
                  settings.brushStyle === preset.style;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className={`btn brush-preset${active ? ' active' : ''}`}
                    aria-pressed={active}
                    onClick={() => {
                      setSize(preset.size);
                      setOpacity(preset.opacity);
                      setBrushStyle(preset.style);
                    }}
                  >
                    {t(preset.key)}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="option-row">
            <span className="option-label">{t('options.brushStyle')}</span>
            <select
              value={settings.brushStyle}
              onChange={(e) =>
                setBrushStyle(e.target.value === 'calligraphy' ? 'calligraphy' : 'round')
              }
              className="font-select"
            >
              <option value="round">{t('options.brushRound')}</option>
              <option value="calligraphy">{t('options.brushCalligraphy')}</option>
            </select>
          </label>
        </>
      )}

      {tool === 'line' && (
        <label className="option-row">
          <span className="option-label">{t('options.lineStyle')}</span>
          <select
            value={settings.lineStyle}
            onChange={(event) => {
              const value = event.target.value;
              setLineStyle(value === 'arrow' || value === 'double-arrow' ? value : 'plain');
            }}
            className="font-select"
          >
            <option value="plain">{t('options.linePlain')}</option>
            <option value="arrow">{t('options.lineArrow')}</option>
            <option value="double-arrow">{t('options.lineDoubleArrow')}</option>
          </select>
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

      {SYMMETRY_TOOLS.includes(tool) && (
        <label className="option-row">
          <span className="option-label">{t('options.symmetry')}</span>
          <select
            value={symmetry}
            onChange={(e) => useDreamStore.getState().setSymmetry(e.target.value as SymmetryMode)}
            className="font-select"
            aria-label={t('options.symmetry')}
          >
            {SYMMETRY_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {t(m.key)}
              </option>
            ))}
          </select>
        </label>
      )}

      {(tool === 'rectangle' || tool === 'ellipse') && (
        <label className="option-row checkbox-field">
          <input
            type="checkbox"
            checked={settings.fillShapes}
            onChange={(e) => useDreamStore.getState().setFillShapes(e.target.checked)}
          />
          <span>{t('options.fillShapes')}</span>
        </label>
      )}

      {tool === 'spray' && (
        <label className="option-row">
          <span className="option-label">{t('options.density')}</span>
          <input
            type="range"
            min={10}
            max={100}
            value={settings.density}
            onChange={(e) => useDreamStore.getState().setDensity(Number(e.target.value))}
          />
          <span className="option-value">{settings.density}</span>
        </label>
      )}

      {tool === 'wand' && (
        <>
          <label className="option-row">
            <span className="option-label">{t('options.tolerance')}</span>
            <input
              type="range"
              min={0}
              max={128}
              value={wandTolerance}
              onChange={(e) => useDreamStore.getState().setWandTolerance(Number(e.target.value))}
            />
            <span className="option-value">{wandTolerance}</span>
          </label>
          <div className="option-row crop-actions">
            <button
              type="button"
              className="btn"
              disabled={!wandDraft}
              onClick={() => useDreamStore.getState().copyWandToLayer()}
            >
              {t('options.wandCopy')}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!wandDraft}
              onClick={() => useDreamStore.getState().deleteWandRegion()}
            >
              {t('options.wandDelete')}
            </button>
          </div>
        </>
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
