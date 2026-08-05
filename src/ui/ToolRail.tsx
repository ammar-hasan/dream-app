/**
 * Left tool rail: big, friendly, MS-Paint-style tool buttons.
 *
 * In Little Dreamer (kid) mode the rail becomes giant icon-only buttons for
 * just the essentials, plus a bright named color palette and three brush
 * sizes shown as dots — no text required anywhere. Hovering or touching a
 * button says its name aloud when "speak tool names" is on.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import type { Color, ToolId } from '../engine/types';
import { useT } from './i18n';
import { useSpeakName } from './useSpeakName';
import {
  BrushIcon,
  CropIcon,
  ChevronUpIcon,
  EllipseIcon,
  EraserIcon,
  EyedropperIcon,
  FillIcon,
  LassoIcon,
  LineIcon,
  LinkIcon,
  MoveIcon,
  PanIcon,
  PencilIcon,
  PenIcon,
  RectangleIcon,
  SelectIcon,
  SprayIcon,
  StampIcon,
  TextIcon,
  WandIcon,
  ZoomIcon,
  GearIcon,
} from './icons';

interface ToolDef {
  id: ToolId;
  /** i18n key under `tools.` */
  key: string;
  /** Shortcut in Draw mode / in Design mode (V flips from Move to Select). */
  shortcut: [draw: string, design: string];
  Icon: (props: Record<string, never>) => JSX.Element;
  /** Design-mode-only tools are hidden in Draw mode. */
  designOnly?: boolean;
}

const TOOLS: ToolDef[] = [
  { id: 'select', key: 'select', shortcut: ['V', 'V'], Icon: SelectIcon, designOnly: true },
  { id: 'lasso', key: 'lasso', shortcut: ['K', 'K'], Icon: LassoIcon, designOnly: true },
  { id: 'link', key: 'link', shortcut: ['U', 'U'], Icon: LinkIcon, designOnly: true },
  { id: 'move', key: 'move', shortcut: ['V', 'M'], Icon: MoveIcon },
  { id: 'brush', key: 'brush', shortcut: ['B', 'B'], Icon: BrushIcon },
  { id: 'pencil', key: 'pencil', shortcut: ['P', 'P'], Icon: PencilIcon },
  { id: 'spray', key: 'spray', shortcut: ['S', 'S'], Icon: SprayIcon },
  { id: 'eraser', key: 'eraser', shortcut: ['E', 'E'], Icon: EraserIcon },
  { id: 'line', key: 'line', shortcut: ['L', 'L'], Icon: LineIcon },
  { id: 'rectangle', key: 'rectangle', shortcut: ['R', 'R'], Icon: RectangleIcon },
  { id: 'ellipse', key: 'ellipse', shortcut: ['O', 'O'], Icon: EllipseIcon },
  { id: 'fill', key: 'fill', shortcut: ['G', 'G'], Icon: FillIcon },
  { id: 'wand', key: 'wand', shortcut: ['W', 'W'], Icon: WandIcon },
  { id: 'stamp', key: 'stamp', shortcut: ['N', 'N'], Icon: StampIcon },
  { id: 'eyedropper', key: 'eyedropper', shortcut: ['I', 'I'], Icon: EyedropperIcon },
  { id: 'text', key: 'text', shortcut: ['T', 'T'], Icon: TextIcon },
  { id: 'pen', key: 'pen', shortcut: ['Y', 'Y'], Icon: PenIcon },
  { id: 'crop', key: 'crop', shortcut: ['C', 'C'], Icon: CropIcon },
  { id: 'pan', key: 'pan', shortcut: ['H', 'H'], Icon: PanIcon },
  { id: 'zoom', key: 'zoom', shortcut: ['Z', 'Z'], Icon: ZoomIcon },
];

const PHONE_DRAW_TOOLS: ToolId[] = ['brush', 'pencil', 'eraser', 'text'];
const PHONE_DESIGN_TOOLS: ToolId[] = ['select', 'move', 'text', 'brush'];

/** Kid mode: the essentials, in the order a child reaches for them. */
export const KID_TOOLS: ToolId[] = [
  'brush',
  'pencil',
  'eraser',
  'fill',
  'stamp',
  'line',
  'rectangle',
  'ellipse',
  'eyedropper',
];

/** Bright named colors for the kid palette (names live under `color.*`). */
const KID_COLORS: { color: Color; key: string }[] = [
  { color: '#ef4444', key: 'red' },
  { color: '#f97316', key: 'orange' },
  { color: '#facc15', key: 'yellow' },
  { color: '#22c55e', key: 'green' },
  { color: '#14b8a6', key: 'teal' },
  { color: '#38bdf8', key: 'sky' },
  { color: '#3b82f6', key: 'blue' },
  { color: '#a855f7', key: 'purple' },
  { color: '#ec4899', key: 'pink' },
  { color: '#92400e', key: 'brown' },
  { color: '#1f2937', key: 'black' },
  { color: '#ffffff', key: 'white' },
];

/** Three brush sizes, shown as dots a kid can compare at a glance. */
const KID_SIZES: { size: number; key: string; dot: number }[] = [
  { size: 6, key: 'kid.sizeSmall', dot: 10 },
  { size: 16, key: 'kid.sizeMedium', dot: 18 },
  { size: 32, key: 'kid.sizeBig', dot: 26 },
];

interface ToolRailProps {
  onOpenPhoneControls?: () => void;
  phoneControlsButtonRef?: RefObject<HTMLButtonElement>;
}

export function ToolRail({ onOpenPhoneControls, phoneControlsButtonRef }: ToolRailProps = {}) {
  const t = useT();
  const speakName = useSpeakName();
  const activeTool = useDreamStore((s) => s.tool);
  const mode = useDreamStore((s) => s.mode);
  const settings = useDreamStore((s) => s.settings);
  const setTool = useDreamStore((s) => s.setTool);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const phoneRailRef = useRef<HTMLElement>(null);
  const allToolsButtonRef = useRef<HTMLButtonElement>(null);
  const [phoneLayout, setPhoneLayout] = useState(
    () => globalThis.matchMedia?.('(max-width: 600px)').matches ?? globalThis.innerWidth <= 600,
  );
  const [allToolsOpen, setAllToolsOpen] = useState(false);

  useEffect(() => {
    const query = globalThis.matchMedia?.('(max-width: 600px)');
    const update = () => setPhoneLayout(query?.matches ?? globalThis.innerWidth <= 600);
    update();
    if (query) query.addEventListener('change', update);
    else window.addEventListener('resize', update);
    return () => {
      if (query) query.removeEventListener('change', update);
      else window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!allToolsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!phoneRailRef.current?.contains(event.target as Node)) setAllToolsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setAllToolsOpen(false);
      allToolsButtonRef.current?.focus();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [allToolsOpen]);

  useEffect(() => {
    setAllToolsOpen(false);
  }, [mode, phoneLayout]);

  const tools = kidMode
    ? TOOLS.filter((tool) => KID_TOOLS.includes(tool.id))
    : TOOLS.filter((tool) => !tool.designOnly || mode === 'design');

  const renderTool = ({ id, key, shortcut, Icon }: ToolDef, closeAfter = false) => {
    const label = t(`tools.${key}`);
    return (
      <button
        key={id}
        type="button"
        className={`tool-btn${activeTool === id ? ' active' : ''}`}
        data-tooltip={kidMode ? undefined : `${label} (${shortcut[mode === 'design' ? 1 : 0]})`}
        aria-label={label}
        aria-pressed={activeTool === id}
        onPointerEnter={() => speakName(label)}
        onFocus={() => speakName(label)}
        onClick={() => {
          if (closeAfter) setAllToolsOpen(false);
          setTool(id);
        }}
      >
        <Icon />
        {!kidMode && <span className="tool-btn-label">{label}</span>}
      </button>
    );
  };

  if (phoneLayout && !kidMode) {
    const preferred = mode === 'design' ? PHONE_DESIGN_TOOLS : PHONE_DRAW_TOOLS;
    const primaryIds = [...new Set([activeTool, ...preferred])]
      .filter((id) => tools.some((tool) => tool.id === id))
      .slice(0, 4);
    const primaryTools = primaryIds.flatMap((id) => {
      const tool = tools.find((candidate) => candidate.id === id);
      return tool ? [tool] : [];
    });

    return (
      <nav
        ref={phoneRailRef}
        className="tool-rail phone-tool-dock"
        aria-label={t('tools.railLabel')}
      >
        {primaryTools.map((tool) => renderTool(tool))}
        <button
          ref={phoneControlsButtonRef}
          type="button"
          className="tool-btn phone-controls-button"
          aria-label={t('tools.controls')}
          data-tooltip={t('tools.controls')}
          onClick={() => {
            setAllToolsOpen(false);
            onOpenPhoneControls?.();
          }}
        >
          <GearIcon />
          <span className="tool-btn-label">{t('tools.controls')}</span>
        </button>
        <button
          ref={allToolsButtonRef}
          type="button"
          className={`tool-btn phone-all-tools-button${allToolsOpen ? ' active' : ''}`}
          aria-label={t('tools.allTools')}
          aria-expanded={allToolsOpen}
          aria-controls="phone-all-tools"
          data-tooltip={t('tools.allTools')}
          onClick={() => setAllToolsOpen((open) => !open)}
        >
          <ChevronUpIcon />
          <span className="tool-btn-label">{t('tools.allTools')}</span>
        </button>
        {allToolsOpen && (
          <div
            id="phone-all-tools"
            className="phone-all-tools"
            role="group"
            aria-label={t('tools.allTools')}
          >
            <strong className="phone-all-tools-title">{t('tools.allTools')}</strong>
            {tools.map((tool) => renderTool(tool, true))}
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav className={`tool-rail${kidMode ? ' kid-rail' : ''}`} aria-label={t('tools.railLabel')}>
      {tools.map((tool) => renderTool(tool))}

      {kidMode && (
        <>
          <div className="kid-colors" role="group" aria-label={t('kid.colors')}>
            {KID_COLORS.map(({ color, key }) => {
              const name = t(`color.${key}`);
              return (
                <button
                  key={key}
                  type="button"
                  className={`kid-swatch${settings.color === color ? ' active' : ''}`}
                  style={{ background: color }}
                  aria-label={name}
                  aria-pressed={settings.color === color}
                  onPointerEnter={() => speakName(name)}
                  onFocus={() => speakName(name)}
                  onClick={() => useDreamStore.getState().setColor(color)}
                />
              );
            })}
          </div>

          <div className="kid-sizes" role="group" aria-label={t('kid.sizes')}>
            {KID_SIZES.map(({ size, key, dot }) => {
              const name = t(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`kid-size${settings.size === size ? ' active' : ''}`}
                  aria-label={name}
                  aria-pressed={settings.size === size}
                  onPointerEnter={() => speakName(name)}
                  onFocus={() => speakName(name)}
                  onClick={() => useDreamStore.getState().setSize(size)}
                >
                  <span
                    className="kid-size-dot"
                    style={{ width: dot, height: dot }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}
