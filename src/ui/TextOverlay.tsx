/** Floating text input placed over the canvas while the text tool is active. */

import { useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // A pointer-down on the canvas creates this overlay. Focus on the next
  // frame so the rest of that same click cannot immediately blur it away.
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

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

  const addSymbol = (symbol: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    setValue(`${value.slice(0, start)}${symbol}${value.slice(end)}`);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  };

  return (
    <div
      ref={wrapRef}
      className="text-overlay-wrap"
      style={{ left: screenPos.x, top: screenPos.y }}
    >
      <textarea
        ref={inputRef}
        className="text-overlay"
        style={{
          fontSize: settings.fontSize * zoom,
          fontFamily: settings.fontFamily,
          color: settings.color,
        }}
        value={value}
        rows={1}
        placeholder={t('text.placeholder')}
        aria-label={t('text.label')}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(event) => {
          if (!wrapRef.current?.contains(event.relatedTarget)) commit();
        }}
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
      <div className="science-symbols" role="group" aria-label={t('text.scienceSymbols')}>
        {t('text.scienceSymbolList')
          .split(' ')
          .map((symbol) => (
            <button
              key={symbol}
              type="button"
              aria-label={symbol}
              onClick={() => addSymbol(symbol)}
            >
              {symbol}
            </button>
          ))}
      </div>
    </div>
  );
}
