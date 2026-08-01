/** Left tool rail: big, friendly, MS-Paint-style tool buttons. */

import { useDreamStore } from '../store/dreamStore';
import type { ToolId } from '../engine/types';
import {
  BrushIcon,
  CropIcon,
  EllipseIcon,
  EraserIcon,
  EyedropperIcon,
  FillIcon,
  LineIcon,
  MoveIcon,
  PanIcon,
  PencilIcon,
  RectangleIcon,
  SelectIcon,
  TextIcon,
  ZoomIcon,
} from './icons';

interface ToolDef {
  id: ToolId;
  label: string;
  /** Shortcut in Draw mode / in Design mode (V flips from Move to Select). */
  shortcut: [draw: string, design: string];
  Icon: (props: Record<string, never>) => JSX.Element;
  /** Design-mode-only tools are hidden in Draw mode. */
  designOnly?: boolean;
}

const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', shortcut: ['V', 'V'], Icon: SelectIcon, designOnly: true },
  { id: 'move', label: 'Move', shortcut: ['V', 'M'], Icon: MoveIcon },
  { id: 'brush', label: 'Brush', shortcut: ['B', 'B'], Icon: BrushIcon },
  { id: 'pencil', label: 'Pencil', shortcut: ['P', 'P'], Icon: PencilIcon },
  { id: 'eraser', label: 'Eraser', shortcut: ['E', 'E'], Icon: EraserIcon },
  { id: 'line', label: 'Line', shortcut: ['L', 'L'], Icon: LineIcon },
  { id: 'rectangle', label: 'Rectangle', shortcut: ['R', 'R'], Icon: RectangleIcon },
  { id: 'ellipse', label: 'Ellipse', shortcut: ['O', 'O'], Icon: EllipseIcon },
  { id: 'fill', label: 'Fill bucket', shortcut: ['G', 'G'], Icon: FillIcon },
  { id: 'eyedropper', label: 'Color picker', shortcut: ['I', 'I'], Icon: EyedropperIcon },
  { id: 'text', label: 'Text', shortcut: ['T', 'T'], Icon: TextIcon },
  { id: 'crop', label: 'Crop', shortcut: ['C', 'C'], Icon: CropIcon },
  { id: 'pan', label: 'Pan', shortcut: ['H', 'H'], Icon: PanIcon },
  { id: 'zoom', label: 'Zoom', shortcut: ['Z', 'Z'], Icon: ZoomIcon },
];

export function ToolRail() {
  const activeTool = useDreamStore((s) => s.tool);
  const mode = useDreamStore((s) => s.mode);
  const setTool = useDreamStore((s) => s.setTool);

  return (
    <nav className="tool-rail" aria-label="Tools">
      {TOOLS.filter((t) => !t.designOnly || mode === 'design').map(
        ({ id, label, shortcut, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tool-btn${activeTool === id ? ' active' : ''}`}
            title={`${label} (${shortcut[mode === 'design' ? 1 : 0]})`}
            aria-label={label}
            aria-pressed={activeTool === id}
            onClick={() => setTool(id)}
          >
            <Icon />
            <span className="tool-btn-label">{label}</span>
          </button>
        ),
      )}
    </nav>
  );
}
