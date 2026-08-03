/** Private second-window controls and notes for a live slideshow. */

import { useEffect, useRef } from 'react';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument, Frame } from '../engine/types';
import { useT } from './i18n';

type PresentationFrame = Pick<Frame, 'layers' | 'presentation'>;

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function SlidePreview({
  doc,
  frame,
  label,
}: {
  doc: DreamDocument;
  frame: PresentationFrame;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const view = canvas.ownerDocument.defaultView;
    const dpr = view?.devicePixelRatio || 1;
    const width = Math.max(240, Math.min(640, canvas.clientWidth || 480));
    const height = Math.max(1, Math.round((width * doc.height) / doc.width));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.aspectRatio = `${doc.width} / ${doc.height}`;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(width / doc.width, height / doc.height);
    context.scale(scale, scale);
    renderDocument({ ...doc, layers: frame.layers }, context);
  }, [doc, frame]);

  return <canvas ref={canvasRef} className="presenter-preview-canvas" aria-label={label} />;
}

export function PresenterConsole({
  doc,
  frames,
  index,
  autoAdvance,
  elapsedMs,
  remainingMs,
  onPrevious,
  onNext,
  onToggleAuto,
  onFocusAudience,
  onExit,
  onClose,
}: {
  doc: DreamDocument;
  frames: PresentationFrame[];
  index: number;
  autoAdvance: boolean;
  elapsedMs: number;
  remainingMs?: number;
  onPrevious: () => void;
  onNext: () => void;
  onToggleAuto: () => void;
  onFocusAudience: () => void;
  onExit: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const frame = frames[index];
  const next = frames[index + 1];
  if (!frame) return null;

  return (
    <main className="presenter-console" onClick={(event) => event.stopPropagation()}>
      <header className="presenter-console-header">
        <div>
          <h1>{t('present.presenterTitle')}</h1>
          <strong>{t('present.currentSlide', { n: index + 1 })}</strong>
        </div>
        <button type="button" className="btn" onClick={onClose}>
          {t('present.closeConsole')}
        </button>
      </header>

      <div className="presenter-console-controls">
        <button type="button" className="btn" disabled={index === 0} onClick={onPrevious}>
          {t('present.previous')}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={index >= frames.length - 1}
          onClick={onNext}
        >
          {t('present.next')}
        </button>
        <button
          type="button"
          className={`btn${autoAdvance ? ' primary' : ''}`}
          aria-pressed={autoAdvance}
          onClick={onToggleAuto}
        >
          {t('present.auto')}
        </button>
        <button type="button" className="btn" onClick={onFocusAudience}>
          {t('present.focusAudience')}
        </button>
        <button type="button" className="btn" onClick={onExit}>
          {t('present.exit')}
        </button>
      </div>

      <section className="presenter-console-current" aria-label={t('present.currentPreview')}>
        <SlidePreview doc={doc} frame={frame} label={t('present.currentPreview')} />
        <div className="presenter-console-notes">
          <h2>{t('slide.notes')}</h2>
          <p>{frame.presentation?.notes || t('present.noNotes')}</p>
        </div>
      </section>

      <section className="presenter-console-stats" aria-label={t('present.timing')}>
        <div>
          <span>{t('present.elapsed')}</span>
          <strong>{formatTime(elapsedMs)}</strong>
        </div>
        <div>
          <span>{t('present.remaining')}</span>
          <strong>
            {remainingMs === undefined ? t('present.noTimer') : formatTime(remainingMs)}
          </strong>
        </div>
        <div>
          <span>{t('slide.duration')}</span>
          <strong>
            {frame.presentation?.durationMs === undefined
              ? t('present.manual')
              : t('present.timed', { seconds: frame.presentation.durationMs / 1000 })}
          </strong>
        </div>
      </section>

      <section className="presenter-console-next" aria-label={t('present.nextPreview')}>
        <h2>{next ? t('present.nextSlide', { n: index + 2 }) : t('present.endOfDeck')}</h2>
        {next ? (
          <SlidePreview doc={doc} frame={next} label={t('present.nextPreview')} />
        ) : (
          <p>{t('present.endOfDeck')}</p>
        )}
      </section>
    </main>
  );
}
