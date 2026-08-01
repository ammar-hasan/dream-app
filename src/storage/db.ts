/**
 * Shared IndexedDB connection. One database holds the project documents
 * ('projects') and the cross-project component library ('components');
 * version 2 added the components store.
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'dream';
const DB_VERSION = 2;
export const PROJECTS_STORE = 'projects';
export const COMPONENTS_STORE = 'components';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
          database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(COMPONENTS_STORE)) {
          database.createObjectStore(COMPONENTS_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/** Test hook: close and drop the cached connection (e.g. before deleting the database). */
export async function __resetDbForTests(): Promise<void> {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      // connection failed to open — nothing to close
    }
    dbPromise = null;
  }
}
