import { beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from './dreamStore';

const store = () => useDreamStore.getState();

beforeEach(() => {
  store().newDocument({ width: 100, height: 80, name: 'Test' });
});

describe('document lifecycle', () => {
  it('newDocument resets to a single clean layer', () => {
    const s = store();
    expect(s.doc.width).toBe(100);
    expect(s.doc.layers).toHaveLength(1);
    expect(s.activeLayerId).toBe(s.doc.layers[0].id);
    expect(s.canUndo).toBe(false);
    expect(s.isDirty).toBe(false);
  });
});

describe('project colors', () => {
  it('adds, edits, uses and removes portable named colors through history', () => {
    store().setColor('#123456');
    expect(store().addProjectColor(' Brand ink ', store().settings.color)).toBe(true);
    const saved = store().doc.projectColors?.[0];
    expect(saved).toMatchObject({ name: 'Brand ink', value: '#123456' });

    store().updateProjectColor(saved!.id, { name: 'Primary ink', value: '#ABC' });
    expect(store().doc.projectColors?.[0]).toMatchObject({
      name: 'Primary ink',
      value: '#aabbcc',
    });
    store().undo();
    expect(store().doc.projectColors?.[0]).toMatchObject({ name: 'Brand ink', value: '#123456' });

    store().deleteProjectColor(saved!.id);
    expect(store().doc.projectColors).toEqual([]);
    store().undo();
    expect(store().doc.projectColors?.[0]?.id).toBe(saved!.id);
  });

  it('rejects invalid colors and empty names', () => {
    expect(store().addProjectColor('', '#123456')).toBe(false);
    expect(store().addProjectColor('Ink', 'red')).toBe(false);
    expect(store().doc.projectColors).toBeUndefined();
  });

  it('enforces the 24-color project limit', () => {
    for (let index = 0; index < 24; index += 1) {
      expect(store().addProjectColor(`Color ${index + 1}`, '#123456')).toBe(true);
    }
    expect(store().addProjectColor('One too many', '#654321')).toBe(false);
    expect(store().doc.projectColors).toHaveLength(24);
  });
});

describe('drawing', () => {
  it('pointer gestures commit an operation to the active layer', () => {
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerMove({ x: 10, y: 10 });
    expect(store().previewOp).not.toBeNull();
    store().pointerUp({ x: 20, y: 20 });

    const s = store();
    expect(s.previewOp).toBeNull();
    expect(s.doc.layers[0].operations).toHaveLength(1);
    expect(s.doc.layers[0].operations[0].kind).toBe('stroke');
    expect(s.canUndo).toBe(true);
    expect(s.isDirty).toBe(true);
  });

  it('undo removes the stroke and redo brings it back', () => {
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerUp({ x: 5, y: 5 });
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(0);
    expect(store().canRedo).toBe(true);
    store().redo();
    expect(store().doc.layers[0].operations).toHaveLength(1);
  });

  it('does not draw on a locked layer', () => {
    const id = store().activeLayerId;
    store().setLayerLocked(id, true);
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerUp({ x: 9, y: 9 });
    expect(store().doc.layers[0].operations).toHaveLength(0);
  });

  it('a tap on the text tool anchors pending text; commitText adds the op', () => {
    store().setTool('text');
    store().pointerDown({ x: 30, y: 40 });
    expect(store().pendingText).toEqual({ x: 30, y: 40 });
    store().commitText('hello dream');
    const ops = store().doc.layers[0].operations;
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'text', text: 'hello dream' });
    expect(store().pendingText).toBeNull();
  });

  it('commitText with empty text adds nothing', () => {
    store().setTool('text');
    store().pointerDown({ x: 1, y: 1 });
    store().commitText('   ');
    expect(store().doc.layers[0].operations).toHaveLength(0);
  });

  it('applyFillAt records a fill operation', () => {
    store().setTool('fill');
    store().applyFillAt(
      { x: 5, y: 5 },
      { data: new Uint8ClampedArray(100 * 80 * 4), width: 100, height: 80 },
    );
    const ops = store().doc.layers[0].operations;
    expect(ops).toHaveLength(1);
    expect(ops[0].kind).toBe('fill');
  });

  it('the first stroke dismisses the hint', () => {
    useDreamStore.setState({ hintDismissed: false });
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerUp({ x: 2, y: 2 });
    expect(store().hintDismissed).toBe(true);
  });
});

describe('layers', () => {
  it('addLayer appends and selects a new layer', () => {
    store().addLayer();
    const s = store();
    expect(s.doc.layers).toHaveLength(2);
    expect(s.doc.layers[1].name).toBe('Layer 2');
    expect(s.activeLayerId).toBe(s.doc.layers[1].id);
  });

  it('deleteLayer removes and reconciles the active layer', () => {
    store().addLayer();
    const topId = store().activeLayerId;
    store().deleteLayer(topId);
    const s = store();
    expect(s.doc.layers).toHaveLength(1);
    expect(s.activeLayerId).toBe(s.doc.layers[0].id);
  });

  it('refuses to delete the last layer', () => {
    store().deleteLayer(store().activeLayerId);
    expect(store().doc.layers).toHaveLength(1);
  });

  it('clearLayer empties the active layer as one undoable command', () => {
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerUp({ x: 5, y: 5 });
    expect(store().doc.layers[0].operations).toHaveLength(1);

    store().clearLayer();
    expect(store().doc.layers[0].operations).toHaveLength(0);
    store().undo();
    expect(store().doc.layers[0].operations).toHaveLength(1);
  });

  it('clearLayer is a no-op on an empty or locked layer', () => {
    store().clearLayer(); // nothing to clear
    expect(store().canUndo).toBe(false);

    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerUp({ x: 5, y: 5 });
    store().setLayerLocked(store().activeLayerId, true);
    const ops = store().doc.layers[0].operations.length;
    store().clearLayer();
    expect(store().doc.layers[0].operations).toHaveLength(ops);
  });

  it('deleted layers come back with undo', () => {
    store().addLayer();
    store().deleteLayer(store().activeLayerId);
    store().undo();
    expect(store().doc.layers).toHaveLength(2);
  });

  it('rename, visibility, opacity, blend mode and lock are undoable', () => {
    const id = store().activeLayerId;
    store().renameLayer(id, 'Sketch');
    store().setLayerVisibility(id, false);
    store().setLayerOpacity(id, 0.3);
    store().setLayerBlendMode(id, 'multiply');
    store().setLayerLocked(id, true);
    const layer = store().doc.layers[0];
    expect(layer).toMatchObject({
      name: 'Sketch',
      visible: false,
      opacity: 0.3,
      blendMode: 'multiply',
      locked: true,
    });
    store().undo();
    store().undo();
    store().undo();
    store().undo();
    store().undo();
    expect(store().doc.layers[0]).toMatchObject({
      name: 'Layer 1',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      locked: false,
    });
  });

  it('moveLayer reorders the stack', () => {
    store().addLayer(); // [Layer 1, Layer 2]
    const bottomId = store().doc.layers[0].id;
    store().moveLayer(bottomId, 1);
    expect(store().doc.layers[1].id).toBe(bottomId);
    store().undo();
    expect(store().doc.layers[0].id).toBe(bottomId);
  });

  it('layer opacity is clamped to 0..1', () => {
    const id = store().activeLayerId;
    store().setLayerOpacity(id, 5);
    expect(store().doc.layers[0].opacity).toBe(1);
  });

  it('manages a per-layer effect stack through history', () => {
    const id = store().activeLayerId;
    expect(store().doc.layers[0].effects).toBeUndefined();

    store().addLayerEffect(id, 'shadow');
    const layer = store().doc.layers[0];
    expect(layer.effects).toHaveLength(1);
    expect(layer.effects![0]).toMatchObject({ type: 'shadow', enabled: true });

    const fxId = layer.effects![0].id;
    store().updateLayerEffect(id, fxId, { radius: 12, opacity: 0.8, color: '#111111' });
    expect(store().doc.layers[0].effects![0].params).toMatchObject({
      radius: 12,
      opacity: 0.8,
      color: '#111111',
    });

    store().toggleLayerEffect(id, fxId);
    expect(store().doc.layers[0].effects![0].enabled).toBe(false);

    store().addLayerEffect(id, 'shadow');
    store().reorderLayerEffect(id, store().doc.layers[0].effects![1].id, 'up');
    expect(store().doc.layers[0].effects!.map((e) => e.id)).toEqual([
      store().doc.layers[0].effects![0].id,
      fxId,
    ]);

    store().undo(); // undo reorder
    store().removeLayerEffect(id, fxId);
    expect(store().doc.layers[0].effects).toHaveLength(1);

    store().undo();
    expect(store().doc.layers[0].effects).toHaveLength(2);
  });
});

describe('raster baking', () => {
  it('replaces the active layer as one undoable AI-style bake', () => {
    store().setTool('brush');
    store().pointerDown({ x: 1, y: 1 });
    store().pointerUp({ x: 5, y: 5 });
    expect(store().doc.layers[0].operations[0].kind).toBe('stroke');

    const pixels = new Uint8ClampedArray(100 * 80 * 4).fill(42);
    store().applyLayerRaster({ data: pixels, width: 100, height: 80 }, 'AI edit');
    expect(store().doc.layers[0].operations).toHaveLength(1);
    expect(store().doc.layers[0].operations[0]).toMatchObject({ kind: 'image', scale: 1 });

    store().undo();
    expect(store().doc.layers[0].operations[0].kind).toBe('stroke');
    store().redo();
    const baked = store().doc.layers[0].operations[0];
    expect(baked.kind).toBe('image');
    if (baked.kind === 'image') expect(baked.patch.data).toBe(pixels);
  });
});

describe('settings and viewport', () => {
  it('setOpacity clamps to 0..1', () => {
    store().setOpacity(1.5);
    expect(store().settings.opacity).toBe(1);
    store().setOpacity(-1);
    expect(store().settings.opacity).toBe(0);
  });

  it('zoom stays inside 25%–800%', () => {
    for (let i = 0; i < 20; i += 1) store().zoomIn();
    expect(store().zoom).toBe(8);
    for (let i = 0; i < 30; i += 1) store().zoomOut();
    expect(store().zoom).toBe(0.25);
  });

  it('panBy shifts the offset', () => {
    store().panBy(10, -4);
    expect(store().offset).toEqual({ x: 10, y: -4 });
  });

  it('setTool clears any in-progress text anchor', () => {
    store().setTool('text');
    store().pointerDown({ x: 1, y: 1 });
    store().setTool('brush');
    expect(store().pendingText).toBeNull();
  });
});
