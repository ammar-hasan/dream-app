/**
 * Links panel (app mode): the active frame's hotspots — target frame,
 * transition, delete — plus the "Preview app" button once any links exist.
 * Broken links (their target frame was deleted) are flagged, not hidden.
 * Rendered in Design mode, where the Link tool lives.
 */

import { activeHotspots, hasHotspots, isHotspotBroken } from '../engine/hotspots';
import type { HotspotTransition } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

const TRANSITIONS: HotspotTransition[] = ['none', 'fade', 'slide'];

export function HotspotsPanel() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const tool = useDreamStore((s) => s.tool);
  const store = useDreamStore.getState;

  if (!doc.frames) return null;

  const frames = doc.frames;
  const hotspots = activeHotspots(doc);

  return (
    <section className="panel hotspots-panel" aria-label={t('link.panel')}>
      <h2 className="panel-title">{t('link.panel')}</h2>

      {tool !== 'link' && <p className="tool-hint">{t('link.hint')}</p>}

      {hotspots.map((hotspot) => {
        const broken = isHotspotBroken(doc, hotspot);
        return (
          <div key={hotspot.id} className={`hotspot-row${broken ? ' broken' : ''}`}>
            <div className="hotspot-row-main">
              <span className="hotspot-glyph" aria-hidden="true">
                ⌁
              </span>
              <select
                value={broken ? '' : hotspot.targetFrameId}
                aria-label={t('link.target')}
                onChange={(e) =>
                  store().updateHotspot(hotspot.id, { targetFrameId: e.target.value })
                }
              >
                {broken && <option value="">{t('link.broken')}</option>}
                {frames.map((frame, i) => (
                  <option key={frame.id} value={frame.id}>
                    {t('timeline.frame', { n: i + 1 })}
                  </option>
                ))}
              </select>
              <select
                value={hotspot.transition}
                aria-label={t('link.transition')}
                onChange={(e) =>
                  store().updateHotspot(hotspot.id, {
                    transition: e.target.value as HotspotTransition,
                  })
                }
              >
                {TRANSITIONS.map((id) => (
                  <option key={id} value={id}>
                    {t(`link.transition.${id}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn icon-btn small"
                data-tooltip={t('link.delete')}
                aria-label={t('link.delete')}
                onClick={() => store().removeHotspot(hotspot.id)}
              >
                ✕
              </button>
            </div>
            {broken && <p className="tool-hint">{t('link.brokenHint')}</p>}
          </div>
        );
      })}

      {hasHotspots(doc) && (
        <button
          type="button"
          className="btn primary hotspot-preview"
          onClick={() => store().previewApp()}
        >
          {t('link.preview')}
        </button>
      )}
    </section>
  );
}
