import { describe, expect, it } from 'vitest';
import {
  brushTool,
  calligraphyWidths,
  createStrokeTool,
  eraserTool,
  pencilTool,
  sprayTool,
  stabilizePoints,
} from './stroke';
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

  it('ignores a duplicate release sample without losing stationary pressure', () => {
    const state = brushTool.begin(
      { point: { x: 0, y: 0 }, shiftKey: false, pressure: 0.2 },
      settings,
    );
    brushTool.update(state, { point: { x: 0, y: 0 }, shiftKey: false, pressure: 0.8 }, settings);
    expect(state.points).toEqual([{ x: 0, y: 0 }]);
    expect(state.widths).toEqual([0.8]);
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

describe('stroke stabilization', () => {
  const wobble = [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
    { x: 20, y: 0 },
    { x: 30, y: 10 },
    { x: 40, y: 0 },
  ];

  it('leaves natural input exact at zero and keeps both endpoints anchored', () => {
    expect(stabilizePoints(wobble, 0)).toEqual(wobble);
    const steady = stabilizePoints(wobble, 100);
    expect(steady[0]).toEqual(wobble[0]);
    expect(steady.at(-1)).toEqual(wobble.at(-1));
    expect(steady[1].y).toBeLessThan(wobble[1].y);
    expect(steady[2].y).toBeGreaterThan(wobble[2].y);
  });

  it('uses the same stabilized geometry for live preview and commit', () => {
    const steady = { ...settings, stabilization: 100 };
    const state = brushTool.begin({ point: wobble[0], shiftKey: false }, steady);
    for (const point of wobble.slice(1)) {
      brushTool.update(state, { point, shiftKey: false }, steady);
    }
    const preview = brushTool.preview(state, steady) as StrokeOp;
    const committed = brushTool.commit(state, steady) as StrokeOp;
    expect(preview.points).toEqual(committed.points);
    expect(committed.points).not.toEqual(wobble);
  });

  it('does not alter spray paths', () => {
    const steady = { ...settings, stabilization: 100 };
    const state = sprayTool.begin({ point: wobble[0], shiftKey: false }, steady);
    for (const point of wobble.slice(1)) {
      sprayTool.update(state, { point, shiftKey: false }, steady);
    }
    expect((sprayTool.commit(state, steady) as StrokeOp).points).toEqual(wobble);
  });
});

describe('calligraphy nib', () => {
  it('makes strokes parallel to the nib thin and crossing strokes broad', () => {
    const thin = calligraphyWidths(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      null,
    );
    const broad = calligraphyWidths(
      [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ],
      null,
    );
    expect(thin[0]).toBeCloseTo(0.18);
    expect(broad[0]).toBeCloseTo(1);
  });

  it('bakes directional widths for mouse input and combines stylus pressure', () => {
    const nib = { ...settings, brushStyle: 'calligraphy' as const };
    const state = brushTool.begin({ point: { x: 0, y: 10 }, shiftKey: false, pressure: 0.5 }, nib);
    brushTool.update(state, { point: { x: 10, y: 0 }, shiftKey: false, pressure: 0.8 }, nib);
    const op = brushTool.commit(state, nib) as StrokeOp;
    expect(op.widths?.[0]).toBeCloseTo(0.5);
    expect(op.widths?.[1]).toBeCloseTo(0.8);

    const mouse = brushTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, nib);
    brushTool.update(mouse, { point: { x: 10, y: 10 }, shiftKey: false }, nib);
    expect((brushTool.commit(mouse, nib) as StrokeOp).widths?.[0]).toBeCloseTo(0.18);
  });

  it('leaves non-brush tools round even when the calligraphy setting is selected', () => {
    const nib = { ...settings, brushStyle: 'calligraphy' as const };
    const state = pencilTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, nib);
    pencilTool.update(state, { point: { x: 10, y: 10 }, shiftKey: false }, nib);
    expect((pencilTool.commit(state, nib) as StrokeOp).widths).toBeUndefined();
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
