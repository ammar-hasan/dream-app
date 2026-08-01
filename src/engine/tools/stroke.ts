/** Freehand stroke tools: brush, pencil, eraser. */

import type { StrokeOp, ToolSettings } from '../types';
import { makeOpId, type DrawingTool, type PointerSample } from './types';

export interface StrokeState {
  points: { x: number; y: number }[];
}

function toOp(tool: StrokeOp['tool'], state: StrokeState, settings: ToolSettings): StrokeOp | null {
  if (state.points.length === 0) return null;
  // Duplicate a single tap so the round cap paints a visible dot.
  const points = state.points.length === 1 ? [state.points[0], state.points[0]] : state.points;
  return {
    kind: 'stroke',
    id: makeOpId(),
    tool,
    points: points.map((p) => ({ ...p })),
    color: settings.color,
    size: settings.size,
    // Pencil and eraser are always fully opaque; the brush honors opacity.
    opacity: tool === 'brush' ? settings.opacity : 1,
  };
}

export function createStrokeTool(tool: StrokeOp['tool']): DrawingTool<StrokeState> {
  return {
    id: tool,
    begin(sample: PointerSample): StrokeState {
      return { points: [{ ...sample.point }] };
    },
    update(state: StrokeState, sample: PointerSample): void {
      state.points.push({ ...sample.point });
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
