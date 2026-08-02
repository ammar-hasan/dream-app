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

function toOp(tool: StrokeOp['tool'], state: StrokeState, settings: ToolSettings): StrokeOp | null {
  if (state.points.length === 0) return null;
  // Duplicate a single tap so the round cap paints a visible dot.
  const single = state.points.length === 1;
  const points = single ? [state.points[0], state.points[0]] : state.points;
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
  if (state.widths) {
    op.widths =
      single && state.widths.length === 1 ? [state.widths[0], state.widths[0]] : [...state.widths];
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
