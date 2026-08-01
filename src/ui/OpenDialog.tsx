/** Open dialog: lists projects stored in IndexedDB. */

import { useEffect, useState } from 'react';
import { deleteProject, listProjects, loadProject, type ProjectMeta } from '../storage/projects';
import { useDreamStore } from '../store/dreamStore';
import { LAST_DOC_KEY } from './usePersistence';
import { TrashIcon } from './icons';

export function OpenDialog({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);

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
        aria-label="Open project"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">Open project</h2>

        {projects === null && <p className="dialog-note">Loading…</p>}
        {projects !== null && projects.length === 0 && (
          <p className="dialog-note">
            No saved projects yet. Draw something — it saves automatically.
          </p>
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
                title="Delete project"
                aria-label={`Delete ${p.name}`}
                onClick={() => void remove(p.id)}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>

        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
