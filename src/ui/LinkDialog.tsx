/**
 * Link dialog: shown after dragging a rectangle with the Link tool.
 * "When tapped, go to frame…" plus an optional transition — Create commits
 * the hotspot as one undoable command, Cancel drops the rect.
 */

import { useState } from 'react';
import type { HotspotTransition } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

const TRANSITIONS: HotspotTransition[] = ['none', 'fade', 'slide'];

export function LinkDialog() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const frames = doc.frames ?? [];
  // Suggest the next screen (or the first one when on the last frame).
  const activeIndex = frames.findIndex((f) => f.id === doc.activeFrameId);
  const suggested = frames[(activeIndex + 1) % frames.length]?.id ?? '';
  const [target, setTarget] = useState(suggested);
  const [transition, setTransition] = useState<HotspotTransition>('fade');

  const close = () => useDreamStore.getState().cancelHotspot();

  return (
    <div className="dialog-backdrop" onClick={close}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('link.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">{t('link.title')}</h2>

        <label className="field">
          <span>{t('link.target')}</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {frames.map((frame, i) => (
              <option key={frame.id} value={frame.id}>
                {t('timeline.frame', { n: i + 1 })}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t('link.transition')}</span>
          <select
            value={transition}
            onChange={(e) => setTransition(e.target.value as HotspotTransition)}
          >
            {TRANSITIONS.map((id) => (
              <option key={id} value={id}>
                {t(`link.transition.${id}`)}
              </option>
            ))}
          </select>
        </label>

        <div className="dialog-actions">
          <button className="btn" onClick={close}>
            {t('common.cancel')}
          </button>
          <button
            className="btn primary"
            onClick={() => useDreamStore.getState().addHotspot(target, transition)}
          >
            {t('link.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
