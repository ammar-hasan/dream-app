/**
 * IndexedDB persistence via `idb`.
 *
 * Whole documents are stored under their id (structured clone handles the
 * Uint8ClampedArray inside fill patches natively). Listing derives metadata
 * from the stored documents — plenty fast for a client-side project library.
 * The connection itself lives in `db.ts` (shared with the component library).
 */

import type { DreamDocument } from '../engine/types';
import { db, PROJECTS_STORE, __resetDbForTests } from './db';

export { __resetDbForTests };

export interface ProjectMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: number;
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
