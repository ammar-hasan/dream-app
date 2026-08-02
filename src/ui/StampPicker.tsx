/**
 * Stamp picker: a friendly grid of the built-in stamps (rendered live with
 * the engine renderer, like the component thumbnails), a Small/Medium/Big
 * size row, and the "Start with a picture" starter scenes. Shared by the
 * adult tool-options panel and the kid panel — in kid mode everything gets
 * bigger and names are spoken aloud on hover/focus/touch.
 */

import { useEffect, useRef } from 'react';
import { renderOperation } from '../engine/renderer';
import { createStamp, STAMP_IDS, type StampId, type StampSize } from '../engine/stamps';
import { createStarterScene, SCENE_IDS, type SceneId } from '../engine/starterScenes';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';
import { useSpeakName } from './useSpeakName';

const SIZE_ORDER: StampSize[] = ['small', 'medium', 'large'];
const SIZE_KEYS: Record<StampSize, string> = {
  small: 'kid.sizeSmall',
  medium: 'kid.sizeMedium',
  large: 'kid.sizeBig',
};

function StampThumb({ id, size }: { id: StampId; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, size, size);
    for (const op of createStamp(id, { x: size / 2, y: size / 2 }, size * 0.86)) {
      renderOperation(op, ctx);
    }
  }, [id, size]);

  return <canvas ref={ref} width={size} height={size} aria-hidden="true" />;
}

function SceneThumb({ id, width, height }: { id: SceneId; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const op of createStarterScene(id, width, height)) renderOperation(op, ctx);
  }, [id, width, height]);

  return <canvas ref={ref} width={width} height={height} aria-hidden="true" />;
}

export function StampPicker({ kid = false }: { kid?: boolean }) {
  const t = useT();
  const speakName = useSpeakName();
  const stamp = useDreamStore((s) => s.stamp);
  const stampSize = useDreamStore((s) => s.stampSize);
  const thumb = kid ? 72 : 44;

  return (
    <div className={`stamp-picker${kid ? ' kid-stamps' : ''}`}>
      <div className="stamp-grid" role="group" aria-label={t('stamp.title')}>
        {STAMP_IDS.map((id) => {
          const name = t(`stamp.${id}`);
          return (
            <button
              key={id}
              type="button"
              className={`stamp-btn${stamp === id ? ' active' : ''}`}
              aria-label={name}
              aria-pressed={stamp === id}
              data-tooltip={kid ? undefined : name}
              onPointerEnter={() => speakName(name)}
              onFocus={() => speakName(name)}
              onClick={() => {
                useDreamStore.getState().setStamp(id);
                speakName(name);
              }}
            >
              <StampThumb id={id} size={thumb} />
              {!kid && <span className="stamp-name">{name}</span>}
            </button>
          );
        })}
      </div>

      <div className="stamp-sizes" role="group" aria-label={t('options.size')}>
        {SIZE_ORDER.map((size) => {
          const name = t(SIZE_KEYS[size]);
          return (
            <button
              key={size}
              type="button"
              className={`btn${stampSize === size ? ' primary' : ''}`}
              aria-label={name}
              aria-pressed={stampSize === size}
              onPointerEnter={() => speakName(name)}
              onFocus={() => speakName(name)}
              onClick={() => useDreamStore.getState().setStampSize(size)}
            >
              {name}
            </button>
          );
        })}
      </div>

      <h3 className="stamp-scenes-title">{t('stamp.startWith')}</h3>
      <div className="stamp-scenes" role="group" aria-label={t('stamp.startWith')}>
        {SCENE_IDS.map((id) => {
          const name = t(`stamp.scene.${id}`);
          return (
            <button
              key={id}
              type="button"
              className="stamp-scene"
              aria-label={name}
              data-tooltip={kid ? undefined : name}
              onPointerEnter={() => speakName(name)}
              onFocus={() => speakName(name)}
              onClick={() => useDreamStore.getState().insertStarterScene(id, name)}
            >
              <SceneThumb id={id} width={kid ? 120 : 104} height={kid ? 90 : 78} />
              <span className="stamp-name">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
