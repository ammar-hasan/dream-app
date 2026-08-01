/**
 * Design mode panel: snapping toggle plus selection actions (group, order,
 * duplicate, delete) and — with a multi-selection — align & distribute.
 * Rendered only in Design mode; Draw mode stays clutter-free.
 */

import { useDreamStore } from '../store/dreamStore';
import type { AlignMode } from '../engine/selection';

const ALIGN_BUTTONS: { mode: AlignMode; glyph: string; label: string }[] = [
  { mode: 'left', glyph: '⇤', label: 'Align left' },
  { mode: 'center', glyph: '↔', label: 'Align horizontal centers' },
  { mode: 'right', glyph: '⇥', label: 'Align right' },
  { mode: 'top', glyph: '⤒', label: 'Align top' },
  { mode: 'middle', glyph: '↕', label: 'Align vertical centers' },
  { mode: 'bottom', glyph: '⤓', label: 'Align bottom' },
];

export function DesignPanel() {
  const selection = useDreamStore((s) => s.selection);
  const snapping = useDreamStore((s) => s.snappingEnabled);
  const store = useDreamStore.getState;
  const count = selection.length;

  return (
    <section className="panel design-panel" aria-label="Design">
      <h2 className="panel-title">Design</h2>

      <label className="option-row checkbox-field">
        <input
          type="checkbox"
          checked={snapping}
          onChange={(e) => store().setSnapping(e.target.checked)}
        />
        <span>Snap to canvas &amp; objects</span>
      </label>

      {count > 0 && (
        <>
          <p className="tool-hint">
            {count} {count === 1 ? 'object' : 'objects'} selected — drag to move, corner handles to
            scale, top handle to rotate.
          </p>
          <div className="design-actions">
            <button
              type="button"
              className="btn"
              disabled={count < 2}
              title="Group (Ctrl/Cmd+G)"
              onClick={() => store().groupSelection()}
            >
              Group
            </button>
            <button
              type="button"
              className="btn"
              disabled={count < 2}
              title="Ungroup (Ctrl/Cmd+Shift+G)"
              onClick={() => store().ungroupSelection()}
            >
              Ungroup
            </button>
            <button
              type="button"
              className="btn"
              title="Duplicate (Ctrl/Cmd+D)"
              onClick={() => store().duplicateSelection()}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="btn danger"
              title="Delete (Del)"
              onClick={() => store().deleteSelection()}
            >
              Delete
            </button>
            <button type="button" className="btn" onClick={() => store().bringForwardSelection()}>
              Forward
            </button>
            <button type="button" className="btn" onClick={() => store().sendBackwardSelection()}>
              Backward
            </button>
          </div>

          {count >= 2 && (
            <div className="align-section">
              <h3 className="panel-title">Align</h3>
              <div className="align-grid">
                {ALIGN_BUTTONS.map(({ mode, glyph, label }) => (
                  <button
                    key={mode}
                    type="button"
                    className="btn icon-btn small"
                    title={label}
                    aria-label={label}
                    onClick={() => store().alignSelection(mode)}
                  >
                    <span aria-hidden="true">{glyph}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="btn icon-btn small"
                  title="Distribute horizontally"
                  aria-label="Distribute horizontally"
                  disabled={count < 3}
                  onClick={() => store().distributeSelection('horizontal')}
                >
                  <span aria-hidden="true">⇹</span>
                </button>
                <button
                  type="button"
                  className="btn icon-btn small"
                  title="Distribute vertically"
                  aria-label="Distribute vertically"
                  disabled={count < 3}
                  onClick={() => store().distributeSelection('vertical')}
                >
                  <span aria-hidden="true">⇳</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
