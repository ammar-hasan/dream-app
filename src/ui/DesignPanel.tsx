/**
 * Design mode panel: snapping toggle plus selection actions (group, order,
 * duplicate, delete) and — with a multi-selection — align & distribute.
 * Rendered only in Design mode; Draw mode stays clutter-free.
 */

import { lazy, Suspense, useState } from 'react';
import { useDreamStore } from '../store/dreamStore';
import type { AlignMode } from '../engine/selection';
import { useT } from './i18n';

const ALIGN_BUTTONS: { mode: AlignMode; glyph: string; key: string }[] = [
  { mode: 'left', glyph: '⇤', key: 'design.alignLeft' },
  { mode: 'center', glyph: '↔', key: 'design.alignCenter' },
  { mode: 'right', glyph: '⇥', key: 'design.alignRight' },
  { mode: 'top', glyph: '⤒', key: 'design.alignTop' },
  { mode: 'middle', glyph: '↕', key: 'design.alignMiddle' },
  { mode: 'bottom', glyph: '⤓', key: 'design.alignBottom' },
];

const DataPlotDialog = lazy(async () => {
  const module = await import('./DataPlotDialog');
  return { default: module.DataPlotDialog };
});

export function DesignPanel() {
  const t = useT();
  const selection = useDreamStore((s) => s.selection);
  const snapping = useDreamStore((s) => s.snappingEnabled);
  const store = useDreamStore.getState;
  const count = selection.length;
  const [plotOpen, setPlotOpen] = useState(false);

  return (
    <section className="panel design-panel" aria-label={t('design.title')}>
      <h2 className="panel-title">{t('design.title')}</h2>

      <label className="option-row checkbox-field">
        <input
          type="checkbox"
          checked={snapping}
          onChange={(e) => store().setSnapping(e.target.checked)}
        />
        <span>{t('design.snap')}</span>
      </label>

      <button type="button" className="btn" onClick={() => setPlotOpen(true)}>
        {t('plot.open')}
      </button>

      {count > 0 && (
        <>
          <p className="tool-hint">
            {t(count === 1 ? 'design.selectedOne' : 'design.selectedMany', { count })}
          </p>
          <div className="design-actions">
            <button
              type="button"
              className="btn"
              disabled={count < 2}
              title={t('design.groupTitle')}
              onClick={() => store().groupSelection()}
            >
              {t('design.group')}
            </button>
            <button
              type="button"
              className="btn"
              disabled={count < 2}
              title={t('design.ungroupTitle')}
              onClick={() => store().ungroupSelection()}
            >
              {t('design.ungroup')}
            </button>
            <button
              type="button"
              className="btn"
              title={t('design.duplicateTitle')}
              onClick={() => store().duplicateSelection()}
            >
              {t('design.duplicate')}
            </button>
            <button
              type="button"
              className="btn danger"
              title={t('design.deleteTitle')}
              onClick={() => store().deleteSelection()}
            >
              {t('design.delete')}
            </button>
            <button type="button" className="btn" onClick={() => store().bringForwardSelection()}>
              {t('design.forward')}
            </button>
            <button type="button" className="btn" onClick={() => store().sendBackwardSelection()}>
              {t('design.backward')}
            </button>
          </div>

          {count >= 2 && (
            <div className="align-section">
              <h3 className="panel-title">{t('design.align')}</h3>
              <div className="align-grid">
                {ALIGN_BUTTONS.map(({ mode, glyph, key }) => (
                  <button
                    key={mode}
                    type="button"
                    className="btn icon-btn small"
                    title={t(key)}
                    aria-label={t(key)}
                    onClick={() => store().alignSelection(mode)}
                  >
                    <span aria-hidden="true">{glyph}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="btn icon-btn small"
                  title={t('design.distributeH')}
                  aria-label={t('design.distributeH')}
                  disabled={count < 3}
                  onClick={() => store().distributeSelection('horizontal')}
                >
                  <span aria-hidden="true">⇹</span>
                </button>
                <button
                  type="button"
                  className="btn icon-btn small"
                  title={t('design.distributeV')}
                  aria-label={t('design.distributeV')}
                  disabled={count < 3}
                  onClick={() => store().distributeSelection('vertical')}
                >
                  <span aria-hidden="true">⇳</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {plotOpen && (
        <Suspense fallback={null}>
          <DataPlotDialog onClose={() => setPlotOpen(false)} />
        </Suspense>
      )}
    </section>
  );
}
