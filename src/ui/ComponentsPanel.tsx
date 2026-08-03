/**
 * Components panel (Design mode): the user's cross-project component library.
 * Thumbnails are rendered with the engine renderer onto small canvases.
 * Double-click inserts an instance at the canvas center; dragging onto the
 * canvas drops it under the cursor. Instances are plain copies.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { renderOperation } from '../engine/renderer';
import type { Component } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import {
  deleteComponent,
  listComponents,
  renameComponent,
  saveComponent,
} from '../storage/components';
import { PlusIcon, TrashIcon } from './icons';
import { useT } from './i18n';

const THUMB_W = 76;
const THUMB_H = 56;

function ComponentThumb({ component }: { component: Component }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, THUMB_W, THUMB_H);
    const scale = Math.min(THUMB_W / component.width, THUMB_H / component.height, 1);
    ctx.save();
    ctx.translate(
      (THUMB_W - component.width * scale) / 2,
      (THUMB_H - component.height * scale) / 2,
    );
    ctx.scale(scale, scale);
    for (const op of component.operations) renderOperation(op, ctx);
    ctx.restore();
  }, [component]);

  return <canvas ref={ref} width={THUMB_W} height={THUMB_H} aria-hidden="true" />;
}

export function ComponentsPanel() {
  const t = useT();
  const hasSelection = useDreamStore((s) => s.selection.length > 0);
  const [components, setComponents] = useState<Component[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const refresh = useCallback(async () => {
    try {
      setComponents(await listComponents());
    } catch (error) {
      console.error('Could not load components', error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async () => {
    const component = useDreamStore.getState().createComponentFromSelection(newName);
    setCreating(false);
    setNewName('');
    if (!component) return;
    try {
      await saveComponent(component);
      await refresh();
    } catch (error) {
      console.error('Could not save component', error);
    }
  };

  const commitRename = async () => {
    if (editingId) {
      try {
        await renameComponent(editingId, editName);
        await refresh();
      } catch (error) {
        console.error('Could not rename component', error);
      }
    }
    setEditingId(null);
  };

  const remove = async (id: string) => {
    try {
      await deleteComponent(id);
      await refresh();
    } catch (error) {
      console.error('Could not delete component', error);
    }
  };

  return (
    <section className="panel components-panel" aria-label={t('components.title')}>
      <div className="panel-header">
        <h2 className="panel-title">{t('components.title')}</h2>
        <button
          type="button"
          className="btn icon-btn"
          data-tooltip={t('components.create')}
          aria-label={t('components.create')}
          disabled={!hasSelection}
          onClick={() => setCreating(true)}
        >
          <PlusIcon />
        </button>
      </div>

      {creating && (
        <div className="component-create">
          <input
            type="text"
            placeholder={t('components.namePlaceholder')}
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void create();
              if (e.key === 'Escape') setCreating(false);
            }}
          />
          <button type="button" className="btn primary" onClick={() => void create()}>
            {t('common.save')}
          </button>
        </div>
      )}

      {!creating && components.length === 0 && <p className="tool-hint">{t('components.hint')}</p>}

      <ul className="component-grid">
        {components.map((component) => (
          <li
            key={component.id}
            className="component-card"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-dream-component', component.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onDoubleClick={() => useDreamStore.getState().insertComponentInstance(component)}
          >
            <div className="component-thumb" data-tooltip={t('components.cardTitle')}>
              <ComponentThumb component={component} />
            </div>
            {editingId === component.id ? (
              <input
                className="layer-rename"
                value={editName}
                autoFocus
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => void commitRename()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span
                className="component-name"
                data-tooltip={t('components.renameTitle')}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingId(component.id);
                  setEditName(component.name);
                }}
              >
                {component.name}
              </span>
            )}
            <button
              type="button"
              className="btn icon-btn small danger component-delete"
              data-tooltip={t('components.delete')}
              aria-label={t('components.deleteNamed', { name: component.name })}
              onClick={() => void remove(component.id)}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
