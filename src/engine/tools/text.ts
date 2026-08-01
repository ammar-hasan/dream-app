/** Text tool: turns a click + typed text into a text operation. */

import { genId } from '../document';
import type { Point, TextOp, ToolSettings } from '../types';

/** Returns null for empty/whitespace text (clicking without typing adds nothing). */
export function createTextOperation(
  point: Point,
  text: string,
  settings: ToolSettings,
): TextOp | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return {
    kind: 'text',
    id: genId('op'),
    position: { ...point },
    text: trimmed,
    color: settings.color,
    opacity: settings.opacity,
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
  };
}
