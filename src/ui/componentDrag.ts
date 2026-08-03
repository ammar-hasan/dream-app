/** The component currently carried by the browser's native drag session. */

import type { Component } from '../engine/types';

let active: Component | null = null;
const endListeners = new Set<() => void>();

export function beginComponentDrag(component: Component): void {
  active = component;
}

export function activeComponentDrag(): Component | null {
  return active;
}

export function endComponentDrag(componentId?: string): void {
  if (componentId !== undefined && active?.id !== componentId) return;
  active = null;
  for (const listener of endListeners) listener();
}

export function onComponentDragEnd(listener: () => void): () => void {
  endListeners.add(listener);
  return () => endListeners.delete(listener);
}
