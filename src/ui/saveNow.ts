/** Save the current document to IndexedDB right now (Save button + voice "save"). */

import { useDreamStore } from '../store/dreamStore';
import { saveProject } from '../storage/projects';
import { LAST_DOC_KEY } from './usePersistence';

export async function saveNow(): Promise<void> {
  const { doc, markSaved } = useDreamStore.getState();
  try {
    await saveProject(doc);
    globalThis.localStorage?.setItem(LAST_DOC_KEY, doc.id);
    markSaved();
  } catch (error) {
    console.error('Save failed', error);
  }
}
