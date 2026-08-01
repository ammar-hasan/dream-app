/**
 * Right panel, bottom half: the layer stack.
 * Displayed top-first; the document stores layers bottom-first.
 */

import { useState } from 'react';
import { useDreamStore } from '../store/dreamStore';
import type { Layer } from '../engine/types';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PlusIcon,
  TrashIcon,
  UnlockIcon,
} from './icons';

export function LayersPanel() {
  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const store = useDreamStore.getState;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Top layer first for display.
  const layers = [...doc.layers].reverse();
  const indexOf = (layer: Layer) => doc.layers.findIndex((l) => l.id === layer.id);

  const commitRename = () => {
    if (editingId) store().renameLayer(editingId, editName);
    setEditingId(null);
  };

  return (
    <section className="panel layers-panel" aria-label="Layers">
      <div className="panel-header">
        <h2 className="panel-title">Layers</h2>
        <button
          type="button"
          className="btn icon-btn"
          title="Add layer"
          aria-label="Add layer"
          onClick={() => store().addLayer()}
        >
          <PlusIcon />
        </button>
      </div>

      <ul className="layer-list">
        {layers.map((layer) => {
          const index = indexOf(layer);
          const isActive = layer.id === activeLayerId;
          return (
            <li
              key={layer.id}
              className={`layer-row${isActive ? ' active' : ''}`}
              onClick={() => store().selectLayer(layer.id)}
            >
              <div className="layer-row-main">
                <button
                  type="button"
                  className="btn icon-btn small"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    store().setLayerVisibility(layer.id, !layer.visible);
                  }}
                >
                  {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
                </button>

                {editingId === layer.id ? (
                  <input
                    className="layer-rename"
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className={`layer-name${layer.visible ? '' : ' hidden-layer'}`}
                    title="Double-click to rename"
                    onDoubleClick={() => {
                      setEditingId(layer.id);
                      setEditName(layer.name);
                    }}
                  >
                    {layer.name}
                  </span>
                )}

                <button
                  type="button"
                  className="btn icon-btn small"
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    store().setLayerLocked(layer.id, !layer.locked);
                  }}
                >
                  {layer.locked ? <LockIcon /> : <UnlockIcon />}
                </button>
              </div>

              {isActive && (
                <div className="layer-row-detail" onClick={(e) => e.stopPropagation()}>
                  <label className="option-row">
                    <span className="option-label">Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(layer.opacity * 100)}
                      onChange={(e) =>
                        store().setLayerOpacity(layer.id, Number(e.target.value) / 100)
                      }
                    />
                    <span className="option-value">{Math.round(layer.opacity * 100)}%</span>
                  </label>
                  <div className="layer-actions">
                    <button
                      type="button"
                      className="btn icon-btn small"
                      title="Move up"
                      aria-label={`Move ${layer.name} up`}
                      disabled={index === doc.layers.length - 1}
                      onClick={() => store().moveLayer(layer.id, index + 1)}
                    >
                      <ChevronUpIcon />
                    </button>
                    <button
                      type="button"
                      className="btn icon-btn small"
                      title="Move down"
                      aria-label={`Move ${layer.name} down`}
                      disabled={index === 0}
                      onClick={() => store().moveLayer(layer.id, index - 1)}
                    >
                      <ChevronDownIcon />
                    </button>
                    <button
                      type="button"
                      className="btn icon-btn small danger"
                      title="Delete layer"
                      aria-label={`Delete ${layer.name}`}
                      disabled={doc.layers.length <= 1}
                      onClick={() => store().deleteLayer(layer.id)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
