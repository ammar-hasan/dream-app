/**
 * Export dialog: flattened PNG/JPEG for still documents; animated documents
 * also get WebM video (recorded client-side), a PNG sprite sheet and the
 * standalone interactive-app HTML. Every document can be downloaded as a
 * portable .dream project file.
 */

import { useState } from 'react';
import { animationSettingsOf } from '../engine/animation';
import { useDreamStore } from '../store/dreamStore';
import { exportImage } from './exportImage';
import { exportAppHtml } from './exportApp';
import { exportRealCodeHtml } from './exportRealCode';
import { downloadDreamFile } from './dreamFile';
import {
  downloadBlob,
  exportAnimationWebM,
  exportSpriteSheet,
  videoDurationSeconds,
  videoFileName,
} from './exportAnimation';
import { useT } from './i18n';

type Format = 'png' | 'jpeg' | 'webm' | 'sprite' | 'app' | 'code' | 'dream';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [format, setFormat] = useState<Format>('png');
  const [quality, setQuality] = useState(92);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const doc = useDreamStore((s) => s.doc);
  const animated = doc.frames !== undefined;
  const fps = animationSettingsOf(doc).fps;

  const doExport = async () => {
    if (format === 'webm') {
      setError(null);
      setProgress(t('export.starting'));
      try {
        const blob = await exportAnimationWebM(doc, {
          fps,
          onProgress: (done, total) => setProgress(t('export.progress', { done, total })),
        });
        downloadBlob(blob, videoFileName(doc.name));
        onClose();
      } catch (err) {
        setProgress(null);
        setError(err instanceof Error ? err.message : t('export.failed'));
      }
      return;
    }
    if (format === 'sprite') {
      exportSpriteSheet(doc);
      onClose();
      return;
    }
    if (format === 'app') {
      exportAppHtml(doc);
      onClose();
      return;
    }
    if (format === 'code') {
      setError(null);
      setNote(null);
      setProgress(t('export.codeProgress'));
      try {
        const { local } = await exportRealCodeHtml(doc);
        setProgress(null);
        // Stay open with a small note — the file is already downloading.
        setNote(t(local ? 'export.codeDoneLocal' : 'export.codeDone'));
      } catch (err) {
        setProgress(null);
        setError(err instanceof Error ? err.message : t('export.failed'));
      }
      return;
    }
    if (format === 'dream') {
      setError(null);
      try {
        await downloadDreamFile(doc);
        onClose();
      } catch {
        setError(t('export.failed'));
      }
      return;
    }
    exportImage(doc, { format, quality: quality / 100 });
    onClose();
  };

  const formats: { id: Format; label: string }[] = [
    { id: 'png', label: 'PNG' },
    { id: 'jpeg', label: 'JPEG' },
    ...(animated
      ? [
          { id: 'webm' as const, label: t('export.webmLabel') },
          { id: 'sprite' as const, label: t('export.spriteLabel') },
          { id: 'app' as const, label: t('export.appLabel') },
          { id: 'code' as const, label: t('export.codeLabel') },
        ]
      : []),
    { id: 'dream', label: t('export.dreamLabel') },
  ];

  return (
    <div className="dialog-backdrop" onClick={progress ? undefined : onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('export.title')}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">{t('export.title')}</h2>

        <div className="field">
          <span>{t('export.format')}</span>
          <div className="preset-grid">
            {formats.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`btn preset${format === id ? ' active' : ''}`}
                onClick={() => {
                  setFormat(id);
                  setError(null);
                  setNote(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {format === 'jpeg' && (
          <label className="option-row">
            <span className="option-label">{t('export.quality')}</span>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
            <span className="option-value">{quality}%</span>
          </label>
        )}

        {format === 'webm' && (
          <p className="dialog-note">
            {t('export.webmNote', {
              frames: doc.frames?.length ?? 0,
              fps,
              seconds: videoDurationSeconds(doc, fps).toFixed(1),
            })}
            {doc.narration ? ` ${t('export.webmWithNarration')}` : ''}
          </p>
        )}

        {format === 'sprite' && <p className="dialog-note">{t('export.spriteNote')}</p>}

        {format === 'app' && <p className="dialog-note">{t('export.appNote')}</p>}

        {format === 'code' && <p className="dialog-note">{t('export.codeNote')}</p>}

        {format === 'dream' && <p className="dialog-note">{t('export.dreamNote')}</p>}

        {progress && (
          <p className="dialog-note">
            {format === 'webm' ? t('export.recording', { progress }) : progress}
          </p>
        )}
        {note && <p className="dialog-note">{note}</p>}
        {error && <p className="dialog-note">{error}</p>}

        <div className="dialog-actions">
          <button className="btn" onClick={onClose} disabled={progress !== null}>
            {t('common.cancel')}
          </button>
          <button
            className="btn primary"
            onClick={() => void doExport()}
            disabled={progress !== null}
          >
            {t('export.title')}
          </button>
        </div>
      </div>
    </div>
  );
}
