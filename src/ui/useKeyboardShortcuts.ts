/** Global keyboard shortcuts. Ignores keystrokes while typing in fields. */

import { useEffect } from 'react';
import { useDreamStore } from '../store/dreamStore';
import type { ToolId } from '../engine/types';

const TOOL_KEYS: Record<string, ToolId> = {
  b: 'brush',
  p: 'pencil',
  e: 'eraser',
  l: 'line',
  r: 'rectangle',
  o: 'ellipse',
  g: 'fill',
  i: 'eyedropper',
  t: 'text',
  h: 'pan',
  z: 'zoom',
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const store = useDreamStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        store.redo();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        store.setSpacePanning(true);
        return;
      }
      if (mod || e.altKey) return;

      if (e.key === 'Escape') {
        store.cancelText();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        store.zoomIn();
        return;
      }
      if (e.key === '-' || e.key === '_') {
        store.zoomOut();
        return;
      }
      const tool = TOOL_KEYS[key];
      if (tool) store.setTool(tool);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') useDreamStore.getState().setSpacePanning(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}
