/**
 * Document factories and immutable update helpers.
 *
 * All helpers return a NEW document object (structural sharing: unchanged
 * layers keep their identity) so history commands stay cheap and Zustand
 * change detection keeps working.
 */

import type { Color, DreamDocument, Layer, Operation } from './types';

let idCounter = 0;

/** Collision-safe enough id for client-side entities. */
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function createLayer(name = 'Layer', operations: Operation[] = []): Layer {
  return { id: genId('layer'), name, visible: true, opacity: 1, locked: false, operations };
}

export interface CreateDocumentOptions {
  width: number;
  height: number;
  name?: string;
  background?: Color;
  id?: string;
}

export function createDocument(options: CreateDocumentOptions): DreamDocument {
  const now = Date.now();
  return {
    id: options.id ?? genId('doc'),
    name: options.name ?? 'Untitled',
    width: Math.max(1, Math.round(options.width)),
    height: Math.max(1, Math.round(options.height)),
    background: options.background ?? '#ffffff',
    layers: [createLayer('Layer 1')],
    createdAt: now,
    updatedAt: now,
  };
}

function touch(doc: DreamDocument, layers: Layer[]): DreamDocument {
  return { ...doc, layers, updatedAt: Date.now() };
}

/** Replace the layers array. */
export function withLayers(doc: DreamDocument, layers: Layer[]): DreamDocument {
  return touch(doc, layers);
}

/** Apply `fn` to the layer with `layerId`; no-op (same doc) if not found. */
export function mapLayer(
  doc: DreamDocument,
  layerId: string,
  fn: (layer: Layer) => Layer,
): DreamDocument {
  const index = doc.layers.findIndex((l) => l.id === layerId);
  if (index === -1) return doc;
  const layers = doc.layers.slice();
  layers[index] = fn(layers[index]);
  return touch(doc, layers);
}

export function appendOperation(doc: DreamDocument, layerId: string, op: Operation): DreamDocument {
  return mapLayer(doc, layerId, (layer) => ({
    ...layer,
    operations: [...layer.operations, op],
  }));
}

export function removeOperation(doc: DreamDocument, layerId: string, opId: string): DreamDocument {
  return mapLayer(doc, layerId, (layer) => ({
    ...layer,
    operations: layer.operations.filter((op) => op.id !== opId),
  }));
}

/** Insert a layer at `index` (default: top of the stack). Index is clamped. */
export function insertLayer(doc: DreamDocument, layer: Layer, index?: number): DreamDocument {
  const at = Math.max(0, Math.min(index ?? doc.layers.length, doc.layers.length));
  const layers = doc.layers.slice();
  layers.splice(at, 0, layer);
  return touch(doc, layers);
}

export function removeLayerById(doc: DreamDocument, layerId: string): DreamDocument {
  if (!doc.layers.some((l) => l.id === layerId)) return doc;
  return touch(
    doc,
    doc.layers.filter((l) => l.id !== layerId),
  );
}

/** Move a layer to `toIndex` (clamped); layers[0] is the bottom of the stack. */
export function moveLayer(doc: DreamDocument, layerId: string, toIndex: number): DreamDocument {
  const fromIndex = doc.layers.findIndex((l) => l.id === layerId);
  if (fromIndex === -1) return doc;
  const target = Math.max(0, Math.min(toIndex, doc.layers.length - 1));
  if (target === fromIndex) return doc;
  const layers = doc.layers.slice();
  const [layer] = layers.splice(fromIndex, 1);
  layers.splice(target, 0, layer);
  return touch(doc, layers);
}

export function updateLayerProps(
  doc: DreamDocument,
  layerId: string,
  patch: Partial<Pick<Layer, 'name' | 'visible' | 'opacity' | 'locked'>>,
): DreamDocument {
  return mapLayer(doc, layerId, (layer) => ({ ...layer, ...patch }));
}
