/** Registry of the drag-based drawing tools keyed by tool id. */

import type { ToolId } from '../types';
import { eraserTool, brushTool, pencilTool } from './stroke';
import { ellipseTool, lineTool, rectangleTool } from './shapes';
import type { DrawingTool } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DRAWING_TOOLS: Partial<Record<ToolId, DrawingTool<any>>> = {
  brush: brushTool,
  pencil: pencilTool,
  eraser: eraserTool,
  line: lineTool,
  rectangle: rectangleTool,
  ellipse: ellipseTool,
};

export * from './types';
export { brushTool, pencilTool, eraserTool, createStrokeTool } from './stroke';
export { lineTool, rectangleTool, ellipseTool, createShapeTool } from './shapes';
export { floodFill, createFillOperation, DEFAULT_FILL_TOLERANCE } from './fill';
export { pickColor } from './eyedropper';
export { createTextOperation } from './text';
export {
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEPS,
  clampZoom,
  nextZoomIn,
  nextZoomOut,
  panBy,
  zoomAtPoint,
} from './viewport';
