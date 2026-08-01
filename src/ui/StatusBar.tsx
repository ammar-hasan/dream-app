/** Bottom status bar: pointer position, canvas size, zoom. */

import { useDreamStore } from '../store/dreamStore';

export function StatusBar() {
  const doc = useDreamStore((s) => s.doc);
  const zoom = useDreamStore((s) => s.zoom);
  const pointerPos = useDreamStore((s) => s.pointerPos);
  const tool = useDreamStore((s) => s.tool);

  return (
    <footer className="status-bar">
      <span className="status-item status-pointer">
        {pointerPos ? `${Math.round(pointerPos.x)}, ${Math.round(pointerPos.y)}` : '—'}
      </span>
      <span className="status-item">
        {doc.width} × {doc.height}
      </span>
      <span className="status-item status-tool">{tool}</span>
      <span className="status-item status-zoom">{Math.round(zoom * 100)}%</span>
    </footer>
  );
}
