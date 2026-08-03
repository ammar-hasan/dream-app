/** Focused CSV/TSV → native scientific plot flow. */

import { useMemo, useState } from 'react';
import { createDataPlot, dataPlotBounds, parsePlotData, type PlotKind } from '../engine/dataPlot';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

const KINDS: PlotKind[] = ['line', 'scatter', 'bar'];

export function DataPlotDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const doc = useDreamStore((state) => state.doc);
  const settings = useDreamStore((state) => state.settings);
  const [kind, setKind] = useState<PlotKind>('line');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState(() => t('plot.sampleData'));
  const parsed = useMemo(() => parsePlotData(source), [source]);

  const insert = () => {
    if (!parsed.ok) return;
    const operations = createDataPlot(parsed.dataset, {
      kind,
      bounds: dataPlotBounds(doc.width, doc.height),
      title,
      color: settings.color,
      fontFamily: settings.fontFamily,
    });
    useDreamStore.getState().insertDataPlot(t('plot.layerName'), operations);
    onClose();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog data-plot-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('plot.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog-title">{t('plot.title')}</h2>
        <p className="dialog-note">{t('plot.intro')}</p>

        <div className="field">
          <span>{t('plot.kind')}</span>
          <div className="preset-grid plot-kind-grid">
            {KINDS.map((value) => (
              <button
                key={value}
                type="button"
                className={`btn preset${kind === value ? ' active' : ''}`}
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
              >
                {t(`plot.kind.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>{t('plot.figureTitle')}</span>
          <input
            type="text"
            value={title}
            maxLength={80}
            placeholder={t('plot.figureTitlePlaceholder')}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="field">
          <span>{t('plot.data')}</span>
          <textarea
            rows={8}
            value={source}
            spellCheck={false}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>

        {parsed.ok ? (
          <p className="plot-ready" role="status">
            {t('plot.ready', {
              rows: parsed.dataset.x.length,
              series: parsed.dataset.series.length,
            })}
          </p>
        ) : (
          <p className="plot-error" role="alert">
            {t(`plot.error.${parsed.error}`)}
          </p>
        )}

        <p className="dialog-note">{t('plot.hint')}</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn primary" disabled={!parsed.ok} onClick={insert}>
            {t('plot.insert')}
          </button>
        </div>
      </div>
    </div>
  );
}
