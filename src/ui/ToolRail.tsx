/** Left tool rail: big, friendly, MS-Paint-style tool buttons. */

import { useDreamStore } from '../store/dreamStore';
import type { ToolId } from '../engine/types';
import {
  BrushIcon,
  EllipseIcon,
  EraserIcon,
  EyedropperIcon,
  FillIcon,
  LineIcon,
  PanIcon,
  PencilIcon,
  RectangleIcon,
  TextIcon,
  ZoomIcon,
} from './icons';

interface ToolDef {
  id: ToolId;
  label: string;
  shortcut: string;
  Icon: (props: Record<string, never>) => JSX.Element;
}

const TOOLS: ToolDef[] = [
  { id: 'brush', label: 'Brush', shortcut: 'B', Icon: BrushIcon },
  { id: 'pencil', label: 'Pencil', shortcut: 'P', Icon: PencilIcon },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', Icon: EraserIcon },
  { id: 'line', label: 'Line', shortcut: 'L', Icon: LineIcon },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', Icon: RectangleIcon },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', Icon: EllipseIcon },
  { id: 'fill', label: 'Fill bucket', shortcut: 'G', Icon: FillIcon },
  { id: 'eyedropper', label: 'Color picker', shortcut: 'I', Icon: EyedropperIcon },
  { id: 'text', label: 'Text', shortcut: 'T', Icon: TextIcon },
  { id: 'pan', label: 'Pan', shortcut: 'H', Icon: PanIcon },
  { id: 'zoom', label: 'Zoom', shortcut: 'Z', Icon: ZoomIcon },
];

export function ToolRail() {
  const activeTool = useDreamStore((s) => s.tool);
  const setTool = useDreamStore((s) => s.setTool);

  return (
    <nav className="tool-rail" aria-label="Tools">
      {TOOLS.map(({ id, label, shortcut, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tool-btn${activeTool === id ? ' active' : ''}`}
          title={`${label} (${shortcut})`}
          aria-label={label}
          aria-pressed={activeTool === id}
          onClick={() => setTool(id)}
        >
          <Icon />
          <span className="tool-btn-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
