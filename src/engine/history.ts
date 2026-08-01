/**
 * Command-based undo/redo.
 *
 * Every mutation of the document goes through a Command that knows how to
 * apply AND revert itself. The stack stores commands, never snapshots, so
 * memory stays flat no matter how large the document grows.
 */

import {
  appendOperation,
  insertLayer,
  moveLayer,
  removeLayerById,
  removeOperation,
  updateLayerProps,
} from './document';
import type { DreamDocument, Layer, Operation } from './types';

export interface Command {
  label: string;
  apply(doc: DreamDocument): DreamDocument;
  revert(doc: DreamDocument): DreamDocument;
}

export class History {
  private past: Command[] = [];
  private future: Command[] = [];

  constructor(readonly limit = 100) {
    if (limit < 1) throw new Error('History limit must be >= 1');
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get depth(): number {
    return this.past.length;
  }

  /** Apply a command and record it. Clears the redo stack. */
  execute(doc: DreamDocument, command: Command): DreamDocument {
    const next = command.apply(doc);
    this.past.push(command);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    return next;
  }

  /** Revert the most recent command. No-op (same doc) when empty. */
  undo(doc: DreamDocument): DreamDocument {
    const command = this.past.pop();
    if (!command) return doc;
    this.future.push(command);
    return command.revert(doc);
  }

  /** Re-apply the most recently undone command. No-op when empty. */
  redo(doc: DreamDocument): DreamDocument {
    const command = this.future.pop();
    if (!command) return doc;
    this.past.push(command);
    return command.apply(doc);
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

// ---------------------------------------------------------------------------
// Command factories. Factories that need prior state (e.g. a layer's index)
// capture it from the document passed at creation time.
// ---------------------------------------------------------------------------

export function addOperationCommand(layerId: string, op: Operation): Command {
  return {
    label: 'Draw',
    apply: (doc) => appendOperation(doc, layerId, op),
    revert: (doc) => removeOperation(doc, layerId, op.id),
  };
}

export function addLayerCommand(layer: Layer, index?: number): Command {
  return {
    label: 'Add layer',
    apply: (doc) => insertLayer(doc, layer, index),
    revert: (doc) => removeLayerById(doc, layer.id),
  };
}

export function removeLayerCommand(doc: DreamDocument, layerId: string): Command {
  const index = doc.layers.findIndex((l) => l.id === layerId);
  const layer = doc.layers[index];
  return {
    label: 'Delete layer',
    apply: (d) => removeLayerById(d, layerId),
    revert: (d) => (layer ? insertLayer(d, layer, index) : d),
  };
}

export function moveLayerCommand(doc: DreamDocument, layerId: string, toIndex: number): Command {
  const fromIndex = doc.layers.findIndex((l) => l.id === layerId);
  return {
    label: 'Reorder layer',
    apply: (d) => moveLayer(d, layerId, toIndex),
    revert: (d) => moveLayer(d, layerId, fromIndex),
  };
}

type LayerPatch = Partial<Pick<Layer, 'name' | 'visible' | 'opacity' | 'locked'>>;

export function updateLayerCommand(
  doc: DreamDocument,
  layerId: string,
  patch: LayerPatch,
  label = 'Update layer',
): Command {
  const layer = doc.layers.find((l) => l.id === layerId);
  const previous: LayerPatch = {};
  if (layer) {
    for (const key of Object.keys(patch) as (keyof LayerPatch)[]) {
      previous[key] = layer[key] as never;
    }
  }
  return {
    label,
    apply: (d) => updateLayerProps(d, layerId, patch),
    revert: (d) => updateLayerProps(d, layerId, previous),
  };
}
