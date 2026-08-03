import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { enableAnimation } from '../engine/animation';
import { createDocument } from '../engine/document';
import {
  __resetDbForTests,
  deleteProject,
  listProjects,
  loadProject,
  saveProject,
} from './projects';

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

describe('projects storage (IndexedDB)', () => {
  it('saves and loads a document round-trip', async () => {
    const doc = createDocument({ width: 320, height: 200, name: 'Roundtrip' });
    await saveProject(doc);
    const loaded = await loadProject(doc.id);
    expect(loaded).toEqual(doc);
  });

  it('returns undefined for unknown ids', async () => {
    expect(await loadProject('missing')).toBeUndefined();
  });

  it('lists projects as metadata sorted by updatedAt desc', async () => {
    const a = createDocument({ width: 10, height: 10, name: 'A' });
    const b = createDocument({ width: 20, height: 20, name: 'B' });
    await saveProject({ ...a, updatedAt: 100 });
    await saveProject({ ...b, updatedAt: 200 });
    const list = await listProjects();
    expect(list.map((p) => p.name)).toEqual(['B', 'A']);
    expect(list[0]).toMatchObject({ width: 20, height: 20, updatedAt: 200 });
  });

  it('overwrites a project on re-save', async () => {
    const doc = createDocument({ width: 10, height: 10, name: 'V1' });
    await saveProject(doc);
    await saveProject({ ...doc, name: 'V2' });
    expect((await loadProject(doc.id))?.name).toBe('V2');
    expect(await listProjects()).toHaveLength(1);
  });

  it('deletes projects', async () => {
    const doc = createDocument({ width: 10, height: 10 });
    await saveProject(doc);
    await deleteProject(doc.id);
    expect(await loadProject(doc.id)).toBeUndefined();
  });

  it('persists fill patch binary data', async () => {
    const doc = createDocument({ width: 4, height: 4 });
    const withFill = {
      ...doc,
      layers: [
        {
          ...doc.layers[0],
          operations: [
            {
              kind: 'fill' as const,
              id: 'f1',
              origin: { x: 1, y: 1 },
              color: '#ff0000',
              opacity: 1,
              patch: {
                x: 0,
                y: 0,
                width: 2,
                height: 2,
                data: new Uint8ClampedArray(16).fill(255),
              },
            },
          ],
        },
      ],
    };
    await saveProject(withFill);
    const loaded = await loadProject(doc.id);
    const op = loaded?.layers[0].operations[0];
    expect(op?.kind).toBe('fill');
    if (op?.kind === 'fill') {
      expect([...op.patch.data]).toEqual(new Array(16).fill(255));
    }
  });

  it('persists imported image ops (structured clone of the pixel bytes)', async () => {
    const doc = createDocument({ width: 8, height: 8 });
    const pixels = new Uint8ClampedArray([1, 2, 3, 255, 5, 6, 7, 128]);
    const withImage = {
      ...doc,
      layers: [
        {
          ...doc.layers[0],
          operations: [
            {
              kind: 'image' as const,
              id: 'im1',
              color: '#000000',
              opacity: 1,
              scale: 2,
              patch: { x: 1, y: 2, width: 2, height: 1, data: pixels },
            },
          ],
        },
      ],
    };
    await saveProject(withImage);
    const loaded = await loadProject(doc.id);
    const op = loaded?.layers[0].operations[0];
    expect(op?.kind).toBe('image');
    if (op?.kind === 'image') {
      expect(op.scale).toBe(2);
      expect(op.patch).toMatchObject({ x: 1, y: 2, width: 2, height: 1 });
      expect([...op.patch.data]).toEqual([...pixels]);
    }
  });

  it('persists animation frames and settings (structured clone)', async () => {
    const animated = enableAnimation(createDocument({ width: 8, height: 8, name: 'Flip' }));
    const doc = {
      ...animated,
      frames: [...(animated.frames ?? []), { id: 'frame-2', layers: animated.layers }],
      animation: { fps: 12, loop: false, onionSkin: true, onionNext: false, onionOpacity: 0.25 },
    };
    await saveProject(doc);
    const loaded = await loadProject(doc.id);
    expect(loaded?.frames).toHaveLength(2);
    expect(loaded?.frames?.[1].id).toBe('frame-2');
    expect(loaded?.activeFrameId).toBe(doc.activeFrameId);
    expect(loaded?.animation).toMatchObject({ fps: 12, loop: false, onionOpacity: 0.25 });
  });

  it('persists the Play-mode cast and settings (additive, backward compatible)', async () => {
    const doc = {
      ...createDocument({ width: 8, height: 8, name: 'Game' }),
      game: {
        cast: { hero: 'layer-1', good: 'layer-2', bad: 'layer-3' },
        settings: { fallSpeed: 240, spawnInterval: 0.8, lives: 5 },
      },
    };
    await saveProject(doc);
    const loaded = await loadProject(doc.id);
    expect(loaded?.game).toEqual(doc.game);
    // A document without the field (old saves) loads with it undefined.
    const plain = createDocument({ width: 8, height: 8 });
    await saveProject(plain);
    expect((await loadProject(plain.id))?.game).toBeUndefined();
  });

  it('persists frame hotspots (app mode), absent on old saves', async () => {
    const animated = enableAnimation(createDocument({ width: 8, height: 8, name: 'Proto' }));
    const frames = animated.frames ?? [];
    const doc = {
      ...animated,
      frames: [
        {
          ...frames[0],
          hotspots: [
            {
              id: 'hs-1',
              rect: { x: 1, y: 2, width: 3, height: 4 },
              targetFrameId: frames[0].id,
              transition: 'slide' as const,
            },
          ],
        },
      ],
    };
    await saveProject(doc);
    const loaded = await loadProject(doc.id);
    expect(loaded?.frames?.[0].hotspots).toEqual(doc.frames[0].hotspots);

    // Frames from older saves simply have no hotspots field.
    const plain = enableAnimation(createDocument({ width: 8, height: 8 }));
    await saveProject(plain);
    expect((await loadProject(plain.id))?.frames?.[0].hotspots).toBeUndefined();
  });

  it('persists per-frame presentation settings, absent on old saves', async () => {
    const animated = enableAnimation(createDocument({ width: 8, height: 8, name: 'Deck' }));
    const frames = animated.frames ?? [];
    const doc = {
      ...animated,
      frames: [
        {
          ...frames[0],
          presentation: { transition: 'fade' as const, durationMs: 5000, notes: 'Welcome' },
        },
      ],
    };
    await saveProject(doc);
    expect((await loadProject(doc.id))?.frames?.[0].presentation).toEqual(
      doc.frames[0].presentation,
    );

    const plain = enableAnimation(createDocument({ width: 8, height: 8 }));
    await saveProject(plain);
    expect((await loadProject(plain.id))?.frames?.[0].presentation).toBeUndefined();
  });

  it('persists the narration take (additive, backward compatible)', async () => {
    const doc = {
      ...createDocument({ width: 8, height: 8, name: 'Story' }),
      narration: { audio: 'data:audio/webm;base64,T25jZSB1cG9uIGEgdGltZQ==', durationMs: 1800 },
    };
    await saveProject(doc);
    const loaded = await loadProject(doc.id);
    expect(loaded?.narration).toEqual(doc.narration);
    // A document without the field (old saves) loads with it undefined.
    const plain = createDocument({ width: 8, height: 8 });
    await saveProject(plain);
    expect((await loadProject(plain.id))?.narration).toBeUndefined();
  });

  it('old saves (no frames/animation/mode fields) load untouched', async () => {
    // A slice-1-era document shape: nothing but the pre-animation fields.
    const doc = createDocument({ width: 8, height: 8 });
    const legacy = { ...doc };
    delete legacy.mode;
    await saveProject(legacy);
    const loaded = await loadProject(doc.id);
    expect(loaded?.frames).toBeUndefined();
    expect(loaded?.activeFrameId).toBeUndefined();
    expect(loaded?.animation).toBeUndefined();
    expect(loaded?.mode).toBeUndefined();
    expect(loaded?.layers).toHaveLength(1);
  });
});
