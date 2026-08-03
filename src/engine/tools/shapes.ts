/** Parametric shape tools: line, rectangle, ellipse. Shift constrains. */

import { constrainEnd } from '../geometry';
import type { ShapeKind, ShapeOp, ToolSettings } from '../types';
import { makeOpId, type DrawingTool, type PointerSample } from './types';

export interface ShapeState {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function createShapeTool(shape: ShapeKind): DrawingTool<ShapeState> {
  const toOp = (state: ShapeState, settings: ToolSettings): ShapeOp | null => {
    if (state.from.x === state.to.x && state.from.y === state.to.y) return null;
    return {
      kind: 'shape',
      id: makeOpId(),
      shape,
      from: { ...state.from },
      to: { ...state.to },
      color: settings.color,
      size: settings.size,
      opacity: settings.opacity,
      ...(shape === 'line' && settings.lineStyle !== 'plain'
        ? { lineStyle: settings.lineStyle }
        : {}),
      // "Fill shapes" fills the interior with the current color (no outline).
      ...(settings.fillShapes && shape !== 'line' ? { fill: true } : {}),
    };
  };

  return {
    id: shape,
    begin(sample: PointerSample): ShapeState {
      return { from: { ...sample.point }, to: { ...sample.point } };
    },
    update(state: ShapeState, sample: PointerSample): void {
      state.to = sample.shiftKey
        ? constrainEnd(state.from, sample.point, shape === 'line' ? 'line' : 'shape')
        : { ...sample.point };
    },
    preview: toOp,
    commit: toOp,
  };
}

export const lineTool = createShapeTool('line');
export const rectangleTool = createShapeTool('rectangle');
export const ellipseTool = createShapeTool('ellipse');
