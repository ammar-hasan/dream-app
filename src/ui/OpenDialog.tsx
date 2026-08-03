/** Open dialog: lists projects stored in IndexedDB, and opens .dream files. */

import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { DreamDocument } from '../engine/types';
import { deleteProject, listProjects, loadProject, type ProjectMeta } from '../storage/projects';
import { useDreamStore } from '../store/dreamStore';
import { readDreamFile, type DreamFileReadStage } from './dreamFile';
import { LAST_DOC_KEY } from './usePersistence';
import { TrashIcon } from './icons';
import { useT } from './i18n';

function projectOpeningCancelled(): Error {
  const error = new Error('Project opening cancelled');
  error.name = 'AbortError';
  return error;
}

function waitForCancellation(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(projectOpeningCancelled()), { once: true });
  });
}

export function OpenDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [fileError, setFileError] = useState(false);
  const [projectError, setProjectError] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const openController = useRef<AbortController | null>(null);

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
    return () => openController.current?.abort();
  }, []);

  const finishOpen = (doc: DreamDocument) => {
    useDreamStore.getState().loadDocument(doc);
    globalThis.localStorage?.setItem(LAST_DOC_KEY, doc.id);
    onClose();
  };

  const runOpen = async (
    initialProgress: string,
    read: (controller: AbortController) => Promise<DreamDocument | undefined>,
    error: () => void,
  ) => {
    if (openController.current) return;
    const controller = new AbortController();
    openController.current = controller;
    setFileError(false);
    setProjectError(false);
    setNote(null);
    setProgress(initialProgress);
    const patienceTimer = globalThis.setTimeout(() => {
      if (!controller.signal.aborted && openController.current === controller) {
        setProgress(t('open.waiting'));
      }
    }, 5_000);
    try {
      const doc = await Promise.race([read(controller), waitForCancellation(controller.signal)]);
      if (!doc) throw new Error('Project was not found');
      if (controller.signal.aborted) throw projectOpeningCancelled();
      finishOpen(doc);
    } catch {
      if (controller.signal.aborted) setNote(t('open.cancelled'));
      else error();
    } finally {
      globalThis.clearTimeout(patienceTimer);
      if (openController.current === controller) openController.current = null;
      setProgress(null);
    }
  };

  const open = async (id: string) => {
    await runOpen(
      t('open.restoring'),
      () => loadProject(id),
      () => setProjectError(true),
    );
  };

  const openFile = async (file: File) => {
    await runOpen(
      t('open.reading'),
      (controller) =>
        readDreamFile(file, {
          signal: controller.signal,
          onProgress: (stage: DreamFileReadStage) => {
            if (!controller.signal.aborted) {
              setProgress(t(stage === 'reading' ? 'open.reading' : 'open.restoring'));
            }
          },
        }),
      () => setFileError(true),
    );
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    if (openController.current) return;
    const file = event.dataTransfer.files[0];
    if (file) void openFile(file);
  };

  const remove = async (id: string) => {
    if (openController.current) return;
    await deleteProject(id);
    if (globalThis.localStorage?.getItem(LAST_DOC_KEY) === id) {
      globalThis.localStorage?.removeItem(LAST_DOC_KEY);
    }
    await refresh();
  };

  return (
    <div className="dialog-backdrop" onClick={progress ? undefined : onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('open.title')}
        aria-busy={progress !== null}
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
              <button
                type="button"
                className="project-open"
                disabled={progress !== null}
                onClick={() => void open(p.id)}
              >
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
                disabled={progress !== null}
                onClick={() => void remove(p.id)}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>

        {progress && (
          <div className="ai-progress">
            <div className="ai-progress-track" role="progressbar" aria-label={progress}>
              <span />
            </div>
            <div className="ai-progress-copy">
              <span>{progress}</span>
            </div>
          </div>
        )}
        {fileError && (
          <p className="dialog-note" role="alert">
            {t('open.fileError')}
          </p>
        )}
        {projectError && (
          <p className="dialog-note" role="alert">
            {t('open.projectError')}
          </p>
        )}
        {note && (
          <p className="dialog-note" role="status">
            {note}
          </p>
        )}

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
          <button
            className="btn"
            disabled={progress !== null}
            onClick={() => fileInput.current?.click()}
          >
            {t('open.file')}
          </button>
          <button
            className="btn"
            onClick={progress ? () => openController.current?.abort() : onClose}
          >
            {t(progress ? 'common.cancel' : 'common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
