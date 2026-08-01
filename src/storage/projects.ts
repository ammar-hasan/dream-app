/**
 * IndexedDB persistence via `idb`.
 *
 * Whole documents are stored under their id (structured clone handles the
 * Uint8ClampedArray inside fill patches natively). Listing derives metadata
 * from the stored documents — plenty fast for a client-side project library.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { DreamDocument } from '../engine/types';

const DB_NAME = 'dream';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

export interface ProjectMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
          database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(doc: DreamDocument): Promise<void> {
  await (await db()).put(PROJECTS_STORE, doc);
}

export async function loadProject(id: string): Promise<DreamDocument | undefined> {
  return (await db()).get(PROJECTS_STORE, id);
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const docs = (await (await db()).getAll(PROJECTS_STORE)) as DreamDocument[];
  return docs
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      width: doc.width,
      height: doc.height,
      updatedAt: doc.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  await (await db()).delete(PROJECTS_STORE, id);
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
