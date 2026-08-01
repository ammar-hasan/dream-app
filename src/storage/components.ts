/**
 * The user's component library: named, reusable groups of operations stored
 * in IndexedDB and shared across all projects. Components are plain data
 * (structured clone handles raster patches), so this module stays framework-
 * free; thumbnails are rendered by the UI with the engine renderer.
 */

import type { Component } from '../engine/types';
import { db, COMPONENTS_STORE } from './db';

export async function saveComponent(component: Component): Promise<void> {
  await (await db()).put(COMPONENTS_STORE, component);
}

export async function getComponent(id: string): Promise<Component | undefined> {
  return (await db()).get(COMPONENTS_STORE, id);
}

/** Most recently updated first. */
export async function listComponents(): Promise<Component[]> {
  const all = (await (await db()).getAll(COMPONENTS_STORE)) as Component[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function renameComponent(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') return;
  const existing = await getComponent(id);
  if (!existing) return;
  await saveComponent({ ...existing, name: trimmed, updatedAt: Date.now() });
}

export async function deleteComponent(id: string): Promise<void> {
  await (await db()).delete(COMPONENTS_STORE, id);
}
