/**
 * Right panel, bottom half: the layer stack.
 * Displayed top-first; the document stores layers bottom-first.
 */

import { useState } from 'react';
import { useDreamStore } from '../store/dreamStore';
import { LAYER_BLEND_MODES, type Layer } from '../engine/types';
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
import { useT } from './i18n';

export function LayersPanel() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const mode = useDreamStore((s) => s.mode);
  const maskEditing = useDreamStore((s) => s.maskEditing);
  const maskMode = useDreamStore((s) => s.maskMode);
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
    <section className="panel layers-panel" aria-label={t('layers.title')}>
      <div className="panel-header">
        <h2 className="panel-title">{t('layers.title')}</h2>
        <button
          type="button"
          className="btn icon-btn"
          data-tooltip={t('layers.add')}
          aria-label={t('layers.add')}
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
                  data-tooltip={layer.visible ? t('layers.hide') : t('layers.show')}
                  aria-label={
                    layer.visible
                      ? t('layers.hideNamed', { name: layer.name })
                      : t('layers.showNamed', { name: layer.name })
                  }
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
                    data-tooltip={t('layers.renameTitle')}
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
                  data-tooltip={layer.locked ? t('layers.unlock') : t('layers.lock')}
                  aria-label={
                    layer.locked
                      ? t('layers.unlockNamed', { name: layer.name })
                      : t('layers.lockNamed', { name: layer.name })
                  }
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
                    <span className="option-label">{t('layers.opacity')}</span>
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
                  {mode === 'design' && (
                    <label className="option-row">
                      <span className="option-label">{t('layers.blendMode')}</span>
                      <select
                        value={layer.blendMode ?? 'normal'}
                        onChange={(event) =>
                          store().setLayerBlendMode(
                            layer.id,
                            event.target.value as (typeof LAYER_BLEND_MODES)[number],
                          )
                        }
                      >
                        {LAYER_BLEND_MODES.map((blendMode) => (
                          <option key={blendMode} value={blendMode}>
                            {t(`layers.blend.${blendMode}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {mode === 'design' &&
                    (layer.mask ? (
                      <div className="layer-mask-controls">
                        <div className="layer-mask-heading">
                          <span>{t('layers.mask.title')}</span>
                          <span className="layer-mask-count">
                            {t('layers.mask.strokes', { count: layer.mask.strokes.length })}
                          </span>
                        </div>
                        <div
                          className="layer-mask-target"
                          role="group"
                          aria-label={t('layers.mask.editTarget')}
                        >
                          <button
                            type="button"
                            className="btn small"
                            aria-pressed={!maskEditing}
                            onClick={() => store().setLayerMaskEditing(false)}
                          >
                            {t('layers.mask.artwork')}
                          </button>
                          <button
                            type="button"
                            className="btn small"
                            aria-pressed={maskEditing}
                            disabled={!layer.mask.enabled || layer.locked}
                            onClick={() => store().setLayerMaskEditing(true)}
                          >
                            {t('layers.mask.mask')}
                          </button>
                        </div>
                        {maskEditing && (
                          <>
                            <p className="layer-mask-hint">{t('layers.mask.hint')}</p>
                            <div
                              className="layer-mask-target"
                              role="group"
                              aria-label={t('layers.mask.brushMode')}
                            >
                              <button
                                type="button"
                                className="btn small"
                                aria-pressed={maskMode === 'hide'}
                                onClick={() => store().setLayerMaskMode('hide')}
                              >
                                {t('layers.mask.hide')}
                              </button>
                              <button
                                type="button"
                                className="btn small"
                                aria-pressed={maskMode === 'reveal'}
                                onClick={() => store().setLayerMaskMode('reveal')}
                              >
                                {t('layers.mask.reveal')}
                              </button>
                            </div>
                          </>
                        )}
                        <div className="layer-mask-footer">
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={layer.mask.enabled}
                              disabled={layer.locked}
                              onChange={(event) =>
                                store().setLayerMaskEnabled(layer.id, event.target.checked)
                              }
                            />
                            {t('layers.mask.enabled')}
                          </label>
                          <button
                            type="button"
                            className="btn small danger"
                            disabled={layer.locked}
                            onClick={() => store().deleteLayerMask(layer.id)}
                          >
                            {t('layers.mask.delete')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn small layer-mask-add"
                        disabled={layer.locked}
                        onClick={() => store().addLayerMask(layer.id)}
                      >
                        {t('layers.mask.add')}
                      </button>
                    ))}
                  <div className="layer-actions">
                    <button
                      type="button"
                      className="btn icon-btn small"
                      data-tooltip={t('layers.moveUp')}
                      aria-label={t('layers.moveUpNamed', { name: layer.name })}
                      disabled={index === doc.layers.length - 1}
                      onClick={() => store().moveLayer(layer.id, index + 1)}
                    >
                      <ChevronUpIcon />
                    </button>
                    <button
                      type="button"
                      className="btn icon-btn small"
                      data-tooltip={t('layers.moveDown')}
                      aria-label={t('layers.moveDownNamed', { name: layer.name })}
                      disabled={index === 0}
                      onClick={() => store().moveLayer(layer.id, index - 1)}
                    >
                      <ChevronDownIcon />
                    </button>
                    <button
                      type="button"
                      className="btn icon-btn small danger"
                      data-tooltip={t('layers.delete')}
                      aria-label={t('layers.deleteNamed', { name: layer.name })}
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
