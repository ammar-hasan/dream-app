/**
 * Inline SVG icon set (24×24, stroke-based). No icon library dependency —
 * these are simple, recognizable glyphs in the spirit of MS Paint.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };
}

export const BrushIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.5 12.5 17 5a2.1 2.1 0 0 1 3 3l-7.5 7.5" />
    <path d="M11 11c-3.5 0-6.5 3-7 8 4.5-.5 8-3 8-6.5" />
  </svg>
);

export const PencilIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

export const EraserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m7 21-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);

export const LineIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 19 19 5" />
  </svg>
);

export const RectangleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
  </svg>
);

export const EllipseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="12" rx="9" ry="6.5" />
  </svg>
);

export const SprayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 3h4v3h-4z" />
    <path d="M10 6h4l1.2 3H8.8L10 6Z" />
    <path d="M12 9v2" />
    <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    <circle cx="7" cy="19" r="1" fill="currentColor" stroke="none" />
    <circle cx="17" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const WandIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4 20 9-9" />
    <path d="M16 3l.9 2.1 2.1.9-2.1.9L16 9l-.9-2.1L13 6l2.1-.9Z" />
    <path d="M20 12l.6 1.4L22 14l-1.4.6L20 16l-.6-1.4L18 14l1.4-.6Z" />
    <path d="M9 4l.5 1.2L10.7 5.7 9.5 6.2 9 7.4 8.5 6.2 7.3 5.7 8.5 5.2Z" />
  </svg>
);

export const LassoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path
      d="M12 4c5 0 9 2.7 9 6.2S17 16.5 12 16.5 3 13.9 3 10.2 7 4 12 4Z"
      strokeDasharray="3.5 2.5"
    />
    <path d="M12 16.5V19l-2.5 2" />
  </svg>
);

export const FillIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 2.7 6.5 6.5-8 8a2.8 2.8 0 0 1-4 0l-2.5-2.5a2.8 2.8 0 0 1 0-4Z" />
    <path d="M5.5 10.5h13" />
    <path d="M20 15c1.2 1.5 2 2.7 2 3.5a2 2 0 1 1-4 0c0-.8.8-2 2-3.5Z" />
  </svg>
);

export const EyedropperIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m2 22 1-4L13.5 7.5l3 3L6 21l-4 1Z" />
    <path d="m14 6 3-3a2.1 2.1 0 0 1 3 3l-3 3" />
  </svg>
);

export const TextIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 6h14" />
    <path d="M12 6v13" />
  </svg>
);

export const PanIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 11V7a1.5 1.5 0 0 1 3 0v6c0 4-2 7-5.5 7S6.5 17.5 5.7 14l-1.2-3.4c-.4-1.1 1.2-2 2-1.2L8 12" />
  </svg>
);

export const ZoomIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
    <path d="M11 8.5v5M8.5 11h5" />
  </svg>
);

export const MoveIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2v20M2 12h20" />
    <path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9 2 12l3 3M19 9l3 3-3 3" />
  </svg>
);

export const SelectIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 3 7 18 2.5-7.5L22 11Z" />
  </svg>
);

export const GroupIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

export const ComponentIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

export const CropIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M2 6h14a2 2 0 0 1 2 2v14" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m21 16-4.5-4.5a1.5 1.5 0 0 0-2 0L7 19" />
  </svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.2 1.5M22 12s-3.5 7-10 7c-2 0-3.7-.6-5.2-1.5" />
    <path d="m3 3 18 18" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const UnlockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 15h10l1-15" />
  </svg>
);

export const ChevronUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const UndoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
);

export const RedoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13l11-6.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const SparkleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
    <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z" />
    <path d="M5 16l.7 1.8L7.5 18.5l-1.8.7L5 21l-.7-1.8L2.5 18.5l1.8-.7Z" />
  </svg>
);

export const MicIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <path d="M12 17v5" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5v14M16 5v14" />
  </svg>
);

export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.3l-5.4 3.2L7.9 13.6 3.4 9.6l6-.6Z" />
  </svg>
);

export const GearIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
  </svg>
);

/**
 * The Dream brand mark: a crescent moon and a spark on the signature
 * indigo→violet→rose gradient, in a soft squircle. Used in the toolbar,
 * the welcome card, the splash screen and (as plain SVG) the favicon.
 */
export const DreamMark = (p: IconProps) => (
  <svg width={28} height={28} viewBox="0 0 32 32" fill="none" aria-hidden={true} {...p}>
    <defs>
      <linearGradient id="dream-mark-g" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0" stopColor="#6d7cff" />
        <stop offset="0.55" stopColor="#a855f7" />
        <stop offset="1" stopColor="#f472b6" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#dream-mark-g)" />
    <path d="M14.5 8.5A7.5 7.5 0 1 0 23 20 8.5 8.5 0 0 1 14.5 8.5Z" fill="#ffffff" opacity="0.95" />
    <path
      d="M22.5 6.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z"
      fill="#ffffff"
      opacity="0.9"
    />
  </svg>
);
