import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createComponentFromOps } from '../engine/selection';
import type { ShapeOp } from '../engine/types';
import { __resetDbForTests } from './db';
import {
  deleteComponent,
  getComponent,
  listComponents,
  renameComponent,
  saveComponent,
} from './components';

// Fresh database per test: close the cached connection, then delete.
beforeEach(async () => {
  await __resetDbForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('dream');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

const rect: ShapeOp = {
  kind: 'shape',
  id: 'r1',
  shape: 'rectangle',
  color: '#3366ff',
  opacity: 1,
  size: 2,
  from: { x: 5, y: 5 },
  to: { x: 25, y: 15 },
};

describe('component library storage (IndexedDB)', () => {
  it('saves and lists components, newest first', async () => {
    const a = { ...createComponentFromOps('Alpha', [rect]), updatedAt: 100 };
    const b = { ...createComponentFromOps('Beta', [rect]), updatedAt: 200 };
    await saveComponent(a);
    await saveComponent(b);
    const list = await listComponents();
    expect(list.map((c) => c.name)).toEqual(['Beta', 'Alpha']);
  });

  it('round-trips a component with its operations intact', async () => {
    const component = createComponentFromOps('Card', [rect]);
    await saveComponent(component);
    expect(await getComponent(component.id)).toEqual(component);
  });

  it('round-trips raster ops (structured clone of the pixel bytes)', async () => {
    const pixels = new Uint8ClampedArray([9, 8, 7, 255]);
    const component = createComponentFromOps('Pixels', [
      {
        kind: 'image',
        id: 'im1',
        color: '#000000',
        opacity: 1,
        scale: 2,
        patch: { x: 3, y: 4, width: 1, height: 1, data: pixels },
      },
    ]);
    await saveComponent(component);
    const loaded = await getComponent(component.id);
    const op = loaded?.operations[0];
    expect(op?.kind).toBe('image');
    if (op?.kind === 'image') {
      expect(op.scale).toBe(2);
      expect([...op.patch.data]).toEqual([...pixels]);
    }
  });

  it('renames a component and bumps updatedAt', async () => {
    const component = { ...createComponentFromOps('Old', [rect]), updatedAt: 1 };
    await saveComponent(component);
    await renameComponent(component.id, 'New');
    const loaded = await getComponent(component.id);
    expect(loaded?.name).toBe('New');
    expect(loaded?.updatedAt).toBeGreaterThan(1);
  });

  it('ignores empty renames and unknown ids', async () => {
    const component = createComponentFromOps('Keep', [rect]);
    await saveComponent(component);
    await renameComponent(component.id, '   ');
    expect((await getComponent(component.id))?.name).toBe('Keep');
    await renameComponent('missing', 'Nope');
    expect(await listComponents()).toHaveLength(1);
  });

  it('deletes components', async () => {
    const component = createComponentFromOps('Bye', [rect]);
    await saveComponent(component);
    await deleteComponent(component.id);
    expect(await getComponent(component.id)).toBeUndefined();
  });
});
