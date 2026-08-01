/**
 * Core domain types for the Dream engine.
 *
 * The engine is pure TypeScript: no DOM, no React, no framework imports.
 * Everything here must stay unit-testable in Node.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Color is always a normalized '#rrggbb' hex string. See color.ts helpers. */
export type Color = string;

export type ToolId =
  | 'brush'
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'fill'
  | 'eyedropper'
  | 'text'
  | 'pan'
  | 'zoom';

/** A rectangular RGBA pixel buffer extracted from a larger raster. */
export interface RasterPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  /** RGBA bytes, length = width * height * 4. */
  data: Uint8ClampedArray;
}

interface OperationBase {
  id: string;
  color: Color;
  /** 0..1, multiplied with the owning layer's opacity at render time. */
  opacity: number;
}

/** Freehand polyline drawn by brush, pencil or eraser. */
export interface StrokeOp extends OperationBase {
  kind: 'stroke';
  tool: 'brush' | 'pencil' | 'eraser';
  points: Point[];
  /** Stroke width in document pixels. */
  size: number;
}

export type ShapeKind = 'line' | 'rectangle' | 'ellipse';

/** Parametric shape between two corner points. */
export interface ShapeOp extends OperationBase {
  kind: 'shape';
  shape: ShapeKind;
  from: Point;
  to: Point;
  /** Outline width in document pixels. */
  size: number;
}

/**
 * Flood fill, baked to a raster patch at commit time (like MS Paint).
 * Baking keeps undo/redo trivial and rendering deterministic.
 */
export interface FillOp extends OperationBase {
  kind: 'fill';
  /** Where the user clicked, in document pixels. */
  origin: Point;
  patch: RasterPatch;
}

export interface TextOp extends OperationBase {
  kind: 'text';
  position: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export type Operation = StrokeOp | ShapeOp | FillOp | TextOp;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  /** 0..1 */
  opacity: number;
  locked: boolean;
  /** Bottom-to-top paint order. */
  operations: Operation[];
}

export interface DreamDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  background: Color;
  /** Bottom-to-top stacking order: layers[0] is painted first. */
  layers: Layer[];
  createdAt: number;
  updatedAt: number;
}

/** User-adjustable settings shared by the drawing tools. */
export interface ToolSettings {
  color: Color;
  size: number;
  /** 0..1 */
  opacity: number;
  fontSize: number;
  fontFamily: string;
}
