/** Open dialog: lists projects stored in IndexedDB, and opens .dream files. */

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { deleteProject, listProjects, loadProject, type ProjectMeta } from '../storage/projects';
import { useDreamStore } from '../store/dreamStore';
import { readDreamFile } from './dreamFile';
import { LAST_DOC_KEY } from './usePersistence';
import { TrashIcon } from './icons';
import { useT } from './i18n';

export function OpenDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [fileError, setFileError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setProjects(await listProjects());
    } catch (error) {
      console.error('Could not list projects', error);
      setProjects([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const open = async (id: string) => {
    const doc = await loadProject(id);
    if (doc) {
      useDreamStore.getState().loadDocument(doc);
      globalThis.localStorage?.setItem(LAST_DOC_KEY, doc.id);
      onClose();
    }
  };

  const openFile = async (file: File) => {
    setFileError(false);
    try {
      const doc = await readDreamFile(file);
      useDreamStore.getState().loadDocument(doc);
      globalThis.localStorage?.setItem(LAST_DOC_KEY, doc.id);
      onClose();
    } catch (error) {
      console.error('Could not open .dream file', error);
      setFileError(true);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void openFile(file);
  };

  const remove = async (id: string) => {
    await deleteProject(id);
    if (globalThis.localStorage?.getItem(LAST_DOC_KEY) === id) {
      globalThis.localStorage?.removeItem(LAST_DOC_KEY);
    }
    await refresh();
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('open.title')}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <h2 className="dialog-title">{t('open.title')}</h2>

        {projects === null && <p className="dialog-note">{t('open.loading')}</p>}
        {projects !== null && projects.length === 0 && (
          <p className="dialog-note">{t('open.empty')}</p>
        )}

        <ul className="project-list">
          {(projects ?? []).map((p) => (
            <li key={p.id} className="project-row">
              <button type="button" className="project-open" onClick={() => void open(p.id)}>
                <span className="project-name">{p.name}</span>
                <span className="project-meta">
                  {p.width} × {p.height} · {new Date(p.updatedAt).toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                className="btn icon-btn small danger"
                data-tooltip={t('open.delete')}
                aria-label={t('open.deleteNamed', { name: p.name })}
                onClick={() => void remove(p.id)}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>

        {fileError && <p className="dialog-note">{t('open.fileError')}</p>}

        <input
          ref={fileInput}
          type="file"
          accept=".dream,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void openFile(file);
          }}
        />

        <div className="dialog-actions">
          <button className="btn" onClick={() => fileInput.current?.click()}>
            {t('open.file')}
          </button>
          <button className="btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
