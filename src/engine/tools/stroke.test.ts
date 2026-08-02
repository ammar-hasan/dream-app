import { describe, expect, it } from 'vitest';
import { brushTool, createStrokeTool, eraserTool, pencilTool, sprayTool } from './stroke';
import { DEFAULT_SETTINGS } from './types';
import type { StrokeOp } from '../types';

const settings = { ...DEFAULT_SETTINGS, color: '#ff0000', size: 12, opacity: 0.5 };

describe('stroke tools', () => {
  it('accumulates points across begin/update', () => {
    const state = brushTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings);
    brushTool.update(state, { point: { x: 5, y: 5 }, shiftKey: false }, settings);
    brushTool.update(state, { point: { x: 9, y: 1 }, shiftKey: false }, settings);
    const op = brushTool.commit(state, settings) as StrokeOp;
    expect(op.points).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 9, y: 1 },
    ]);
  });

  it('brush commit carries color, size and opacity from settings', () => {
    const state = brushTool.begin({ point: { x: 1, y: 1 }, shiftKey: false }, settings);
    const op = brushTool.commit(state, settings) as StrokeOp;
    expect(op.kind).toBe('stroke');
    expect(op.tool).toBe('brush');
    expect(op.color).toBe('#ff0000');
    expect(op.size).toBe(12);
    expect(op.opacity).toBe(0.5);
  });

  it('a single tap becomes a two-point stroke so a dot renders', () => {
    const state = brushTool.begin({ point: { x: 3, y: 3 }, shiftKey: false }, settings);
    const op = brushTool.commit(state, settings) as StrokeOp;
    expect(op.points).toEqual([
      { x: 3, y: 3 },
      { x: 3, y: 3 },
    ]);
  });

  it('pencil and eraser ignore the opacity setting', () => {
    const pencil = pencilTool.commit(
      pencilTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings),
      settings,
    ) as StrokeOp;
    expect(pencil.tool).toBe('pencil');
    expect(pencil.opacity).toBe(1);

    const eraser = eraserTool.commit(
      eraserTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings),
      settings,
    ) as StrokeOp;
    expect(eraser.tool).toBe('eraser');
    expect(eraser.opacity).toBe(1);
  });

  it('preview mirrors the in-progress stroke', () => {
    const state = brushTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings);
    brushTool.update(state, { point: { x: 4, y: 4 }, shiftKey: false }, settings);
    const preview = brushTool.preview(state, settings) as StrokeOp;
    expect(preview.points).toHaveLength(2);
    expect(preview.tool).toBe('brush');
  });

  it('committed ids differ between strokes', () => {
    const a = brushTool.commit(
      brushTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings),
      settings,
    );
    const b = brushTool.commit(
      brushTool.begin({ point: { x: 1, y: 1 }, shiftKey: false }, settings),
      settings,
    );
    expect(a?.id).not.toBe(b?.id);
  });
});

describe('pressure sensitivity', () => {
  it('records per-point width multipliers for pen samples', () => {
    const state = brushTool.begin(
      { point: { x: 0, y: 0 }, shiftKey: false, pressure: 0.2 },
      settings,
    );
    brushTool.update(state, { point: { x: 5, y: 0 }, shiftKey: false, pressure: 0.8 }, settings);
    brushTool.update(state, { point: { x: 9, y: 0 }, shiftKey: false, pressure: 1 }, settings);
    const op = brushTool.commit(state, settings) as StrokeOp;
    expect(op.widths).toEqual([0.2, 0.8, 1]);
  });

  it('mouse strokes (no pressure) carry no widths — uniform rendering', () => {
    const state = brushTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings);
    brushTool.update(state, { point: { x: 5, y: 5 }, shiftKey: false }, settings);
    const op = brushTool.commit(state, settings) as StrokeOp;
    expect(op.widths).toBeUndefined();
  });

  it('clamps feather-light pressure to a visible minimum', () => {
    const state = brushTool.begin(
      { point: { x: 0, y: 0 }, shiftKey: false, pressure: 0.01 },
      settings,
    );
    const op = brushTool.commit(state, settings) as StrokeOp;
    expect(op.widths).toEqual([0.1, 0.1]); // single tap duplicates the sample
  });

  it('a pressure gap mid-stroke falls back to the previous width', () => {
    const state = brushTool.begin(
      { point: { x: 0, y: 0 }, shiftKey: false, pressure: 0.5 },
      settings,
    );
    brushTool.update(state, { point: { x: 5, y: 0 }, shiftKey: false }, settings);
    const op = brushTool.commit(state, settings) as StrokeOp;
    expect(op.widths).toEqual([0.5, 0.5]);
  });
});

describe('spray tool', () => {
  it('commits a stroke with a seed and the density setting', () => {
    const state = sprayTool.begin({ point: { x: 2, y: 2 }, shiftKey: false }, settings);
    sprayTool.update(state, { point: { x: 8, y: 8 }, shiftKey: false }, settings);
    const op = sprayTool.commit(state, settings) as StrokeOp;
    expect(op.tool).toBe('spray');
    expect(typeof op.seed).toBe('number');
    expect(op.density).toBe(settings.density);
    expect(op.opacity).toBe(0.5); // honors opacity like the brush
  });

  it('an injected random source makes the seed deterministic', () => {
    const seeded = createStrokeTool('spray', () => 0.5);
    const state = seeded.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings);
    const op = seeded.commit(state, settings) as StrokeOp;
    expect(op.seed).toBe(Math.floor(0.5 * 0xffffffff));
  });
});
