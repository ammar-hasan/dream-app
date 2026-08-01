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
  c: 'crop',
  h: 'pan',
  m: 'move',
  z: 'zoom',
};

const ARROW_NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
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
      const designing = store.mode === 'design';

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
      // Design-mode selection shortcuts.
      if (designing && mod && key === 'd') {
        e.preventDefault(); // keep the browser's bookmark shortcut away
        store.duplicateSelection();
        return;
      }
      if (designing && mod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) store.ungroupSelection();
        else store.groupSelection();
        return;
      }
      if (designing && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (store.selection.length > 0) {
          e.preventDefault();
          store.deleteSelection();
        }
        return;
      }
      if (designing && ARROW_NUDGE[e.key]) {
        if (store.selection.length > 0) {
          e.preventDefault();
          const [dx, dy] = ARROW_NUDGE[e.key];
          const step = e.shiftKey ? 10 : 1;
          store.nudgeSelection(dx * step, dy * step);
        }
        return;
      }
      if (e.key === ' ') {
        // Space is hold-to-pan, EXCEPT when focus is inside the timeline bar
        // (where it toggles play — see TimelineBar) or while presenting
        // (where it advances the slide — see PresentView).
        const inTimeline = e.target instanceof HTMLElement && !!e.target.closest('.timeline-bar');
        if (!inTimeline && store.mode !== 'present') {
          e.preventDefault();
          store.setSpacePanning(true);
        }
        return;
      }
      if (mod || e.altKey) return;

      if (e.key === 'Escape') {
        if (designing && store.selection.length > 0) store.clearSelection();
        else if (store.cropDraft) store.cancelCrop();
        else store.cancelText();
        return;
      }
      if (e.key === 'Enter' && store.cropDraft) {
        store.applyCrop();
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
      // V is mode-aware: Select in Design mode, Move in Draw mode.
      if (key === 'v') {
        store.setTool(designing ? 'select' : 'move');
        return;
      }
      if (key === 'a') {
        store.toggleAiPanel();
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
