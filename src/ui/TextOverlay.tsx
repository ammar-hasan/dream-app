/** Floating text input placed over the canvas while the text tool is active. */

import { useRef, useState } from 'react';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';
import type { Point } from '../engine/types';

interface TextOverlayProps {
  /** Screen-space position of the text anchor inside the viewport wrapper. */
  screenPos: Point;
}

export function TextOverlay({ screenPos }: TextOverlayProps) {
  const t = useT();
  const settings = useDreamStore((s) => s.settings);
  const zoom = useDreamStore((s) => s.zoom);
  const [value, setValue] = useState('');
  const doneRef = useRef(false);

  const commit = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    useDreamStore.getState().commitText(value);
  };

  const cancel = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    useDreamStore.getState().cancelText();
  };

  return (
    <textarea
      className="text-overlay"
      style={{
        left: screenPos.x,
        top: screenPos.y,
        fontSize: settings.fontSize * zoom,
        fontFamily: settings.fontFamily,
        color: settings.color,
      }}
      value={value}
      autoFocus
      rows={1}
      placeholder={t('text.placeholder')}
      aria-label={t('text.label')}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      }}
    />
  );
}
