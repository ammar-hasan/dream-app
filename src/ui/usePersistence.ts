/**
 * Persistence wiring: debounced autosave of the current document to
 * IndexedDB, plus restoring the last open document on launch.
 */

import { useEffect } from 'react';
import { loadProject, saveProject } from '../storage/projects';
import { useDreamStore } from '../store/dreamStore';

export const LAST_DOC_KEY = 'dream:last-doc-id';
const AUTOSAVE_DELAY_MS = 800;

export function useAutosave(): void {
  const doc = useDreamStore((s) => s.doc);
  const isDirty = useDreamStore((s) => s.isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await saveProject(doc);
          globalThis.localStorage?.setItem(LAST_DOC_KEY, doc.id);
          useDreamStore.getState().markSaved();
        } catch (error) {
          console.error('Autosave failed', error);
        }
      })();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [doc, isDirty]);
}

export function useRestoreLastDocument(): void {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const id = globalThis.localStorage?.getItem(LAST_DOC_KEY);
        if (!id) return;
        const doc = await loadProject(id);
        if (doc && !cancelled) useDreamStore.getState().loadDocument(doc);
      } catch (error) {
        console.error('Could not restore last document', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
