import { useState } from 'react';
import {
  DEFAULT_SLIDE_DURATION_SECONDS,
  MAX_FRAME_CAPTION_LENGTH,
  MAX_SLIDE_DURATION_SECONDS,
  MIN_SLIDE_DURATION_SECONDS,
  slideDurationMs,
} from '../engine/animation';
import type { Frame, SlideTransition } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

const TRANSITIONS: SlideTransition[] = ['none', 'fade', 'slide'];

export function SlideSettingsDialog({ frame, onClose }: { frame: Frame; onClose: () => void }) {
  const t = useT();
  const current = frame.presentation;
  const [transition, setTransition] = useState<SlideTransition>(current?.transition ?? 'none');
  const [timed, setTimed] = useState(current?.durationMs !== undefined);
  const [seconds, setSeconds] = useState(
    current?.durationMs === undefined ? DEFAULT_SLIDE_DURATION_SECONDS : current.durationMs / 1000,
  );
  const [notes, setNotes] = useState(current?.notes ?? '');
  const [caption, setCaption] = useState(current?.caption ?? '');

  const save = () => {
    const cleanNotes = notes.trim();
    const cleanCaption = caption.trim();
    const presentation = {
      ...(transition !== 'none' ? { transition } : {}),
      ...(timed ? { durationMs: slideDurationMs(seconds) } : {}),
      ...(cleanNotes ? { notes: cleanNotes } : {}),
      ...(cleanCaption ? { caption: cleanCaption } : {}),
    };
    useDreamStore
      .getState()
      .setFramePresentation(frame.id, Object.keys(presentation).length ? presentation : undefined);
    onClose();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog slide-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('slide.title')}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') onClose();
        }}
      >
        <h2 className="dialog-title">{t('slide.title')}</h2>

        <label className="field">
          <span>{t('slide.transition')}</span>
          <select
            autoFocus
            value={transition}
            onChange={(event) => setTransition(event.target.value as SlideTransition)}
          >
            {TRANSITIONS.map((id) => (
              <option key={id} value={id}>
                {t(`slide.transition.${id}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="slide-timing-toggle">
          <input
            type="checkbox"
            checked={timed}
            onChange={(event) => setTimed(event.target.checked)}
          />
          <span>{t('slide.autoAdvance')}</span>
        </label>

        {timed && (
          <label className="field">
            <span>{t('slide.duration')}</span>
            <input
              type="number"
              min={MIN_SLIDE_DURATION_SECONDS}
              max={MAX_SLIDE_DURATION_SECONDS}
              step={1}
              value={seconds}
              onChange={(event) => setSeconds(Number(event.target.value))}
            />
          </label>
        )}

        <label className="field">
          <span>{t('slide.caption')}</span>
          <textarea
            rows={3}
            maxLength={MAX_FRAME_CAPTION_LENGTH}
            value={caption}
            placeholder={t('slide.captionPlaceholder')}
            onChange={(event) => setCaption(event.target.value)}
          />
          <span className="dialog-note">{t('slide.captionHint')}</span>
        </label>

        <label className="field">
          <span>{t('slide.notes')}</span>
          <textarea
            rows={5}
            value={notes}
            placeholder={t('slide.notesPlaceholder')}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn primary" onClick={save}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
