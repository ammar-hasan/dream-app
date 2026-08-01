/** Top toolbar: identity, file operations, history, zoom. */

import { useDreamStore } from '../store/dreamStore';
import { saveProject } from '../storage/projects';
import { exportPng } from './exportPng';
import { LAST_DOC_KEY } from './usePersistence';
import { RedoIcon, UndoIcon, ZoomIcon } from './icons';

interface ToolbarProps {
  onNew: () => void;
  onOpen: () => void;
}

export function Toolbar({ onNew, onOpen }: ToolbarProps) {
  const docName = useDreamStore((s) => s.doc.name);
  const isDirty = useDreamStore((s) => s.isDirty);
  const canUndo = useDreamStore((s) => s.canUndo);
  const canRedo = useDreamStore((s) => s.canRedo);
  const zoom = useDreamStore((s) => s.zoom);

  const saveNow = async () => {
    const { doc, markSaved } = useDreamStore.getState();
    try {
      await saveProject(doc);
      globalThis.localStorage?.setItem(LAST_DOC_KEY, doc.id);
      markSaved();
    } catch (error) {
      console.error('Save failed', error);
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <span className="app-title">Dream</span>
        <span className="doc-name" title={docName}>
          {docName}
          {isDirty ? ' •' : ''}
        </span>
      </div>

      <div className="toolbar-group">
        <button className="btn" onClick={onNew}>
          New
        </button>
        <button className="btn" onClick={onOpen}>
          Open
        </button>
        <button className="btn" onClick={() => void saveNow()}>
          Save
        </button>
        <button className="btn" onClick={() => exportPng(useDreamStore.getState().doc)}>
          Export PNG
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className="btn icon-btn"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => useDreamStore.getState().undo()}
        >
          <UndoIcon />
        </button>
        <button
          className="btn icon-btn"
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={() => useDreamStore.getState().redo()}
        >
          <RedoIcon />
        </button>
      </div>

      <div className="toolbar-group toolbar-zoom">
        <button
          className="btn"
          aria-label="Zoom out"
          onClick={() => useDreamStore.getState().zoomOut()}
        >
          −
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          className="btn"
          aria-label="Zoom in"
          onClick={() => useDreamStore.getState().zoomIn()}
        >
          +
        </button>
        <ZoomIcon className="toolbar-zoom-icon" />
      </div>
    </header>
  );
}
