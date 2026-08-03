/**
 * Freehand stroke tools: brush, pencil, eraser, spray.
 *
 * Pressure: when the pointer reports stylus pressure (pen only — the
 * viewport passes `undefined` for mouse/touch) each sample carries a width
 * multiplier, stored per point on the op. Mouse strokes keep `widths`
 * absent and render exactly as before.
 */

import type { StrokeOp, ToolSettings } from '../types';
import { makeOpId, type DrawingTool, type PointerSample } from './types';

export interface StrokeState {
  points: { x: number; y: number }[];
  /** Per-point pressure multipliers; null until a pen sample arrives. */
  widths: number[] | null;
  /** Spray seed, rolled once per stroke so every redraw paints the same mist. */
  seed: number;
}

/** Map raw stylus pressure to a usable width multiplier. */
export function pressureWidth(pressure: number): number {
  return Math.min(1, Math.max(0.1, pressure));
}

/**
 * Smooth a sampled path without moving either endpoint. The centered,
 * triangular window reduces small pointer wobbles while keeping taps,
 * deliberate corners and the live pointer position predictable.
 */
export function stabilizePoints(
  points: readonly { x: number; y: number }[],
  amount: number,
): { x: number; y: number }[] {
  const strength = Math.min(1, Math.max(0, amount / 100));
  if (strength === 0 || points.length < 3) return points.map((point) => ({ ...point }));

  const radius = Math.max(1, Math.round(strength * 6));
  const last = points.length - 1;
  return points.map((point, index) => {
    if (index === 0 || index === last) return { ...point };
    let x = 0;
    let y = 0;
    let total = 0;
    for (
      let sample = Math.max(0, index - radius);
      sample <= Math.min(last, index + radius);
      sample++
    ) {
      const weight = radius + 1 - Math.abs(sample - index);
      x += points[sample].x * weight;
      y += points[sample].y * weight;
      total += weight;
    }
    return {
      x: point.x + (x / total - point.x) * strength,
      y: point.y + (y / total - point.y) * strength,
    };
  });
}

/**
 * Width multipliers for a fixed 45-degree broad nib. A stroke parallel to
 * the nib's long edge is thin; one crossing it is broad. Optional pressure
 * continues to modulate that directional width.
 */
export function calligraphyWidths(
  points: readonly { x: number; y: number }[],
  pressures: readonly number[] | null,
): number[] {
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)] ?? point;
    const after = points[Math.min(points.length - 1, index + 1)] ?? point;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const direction = dx === 0 && dy === 0 ? Math.PI * 0.75 : Math.atan2(dy, dx);
    const directional = 0.18 + 0.82 * Math.abs(Math.sin(direction - Math.PI / 4));
    const pressure = pressures?.[index] ?? 1;
    return Math.max(0.1, Math.min(1, directional * pressure));
  });
}

function toOp(tool: StrokeOp['tool'], state: StrokeState, settings: ToolSettings): StrokeOp | null {
  if (state.points.length === 0) return null;
  const sourcePoints =
    tool === 'brush' || tool === 'pencil' || tool === 'eraser'
      ? stabilizePoints(state.points, settings.stabilization)
      : state.points;
  // Duplicate a single tap so the round cap paints a visible dot.
  const single = sourcePoints.length === 1;
  const points = single ? [sourcePoints[0], sourcePoints[0]] : sourcePoints;
  const op: StrokeOp = {
    kind: 'stroke',
    id: makeOpId(),
    tool,
    points: points.map((p) => ({ ...p })),
    color: settings.color,
    size: settings.size,
    // Pencil and eraser are always fully opaque; brush and spray honor opacity.
    opacity: tool === 'brush' || tool === 'spray' ? settings.opacity : 1,
  };
  const widths =
    tool === 'brush' && settings.brushStyle === 'calligraphy'
      ? calligraphyWidths(sourcePoints, state.widths)
      : state.widths;
  if (widths) {
    op.widths = single && widths.length === 1 ? [widths[0], widths[0]] : [...widths];
  }
  if (tool === 'spray') {
    op.seed = state.seed;
    op.density = settings.density;
  }
  return op;
}

export function createStrokeTool(
  tool: StrokeOp['tool'],
  random: () => number = Math.random,
): DrawingTool<StrokeState> {
  return {
    id: tool,
    begin(sample: PointerSample): StrokeState {
      return {
        points: [{ ...sample.point }],
        widths: sample.pressure === undefined ? null : [pressureWidth(sample.pressure)],
        seed: Math.floor(random() * 0xffffffff),
      };
    },
    update(state: StrokeState, sample: PointerSample): void {
      const last = state.points[state.points.length - 1];
      if (last && last.x === sample.point.x && last.y === sample.point.y) {
        if (state.widths && sample.pressure !== undefined) {
          state.widths[state.widths.length - 1] = pressureWidth(sample.pressure);
        }
        return;
      }
      state.points.push({ ...sample.point });
      if (state.widths) {
        // Once a stroke carries widths every point needs one; a gap in pen
        // reporting falls back to the previous sample.
        state.widths.push(
          sample.pressure === undefined
            ? state.widths[state.widths.length - 1]
            : pressureWidth(sample.pressure),
        );
      }
    },
    preview(state: StrokeState, settings: ToolSettings) {
      return toOp(tool, state, settings);
    },
    commit(state: StrokeState, settings: ToolSettings) {
      return toOp(tool, state, settings);
    },
  };
}

export const brushTool = createStrokeTool('brush');
export const pencilTool = createStrokeTool('pencil');
export const eraserTool = createStrokeTool('eraser');
export const sprayTool = createStrokeTool('spray');
