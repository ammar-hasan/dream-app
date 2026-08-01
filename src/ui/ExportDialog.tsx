/**
 * Export dialog: flattened PNG/JPEG for still documents; animated documents
 * also get WebM video (recorded client-side) and a PNG sprite sheet.
 */

import { useState } from 'react';
import { animationSettingsOf } from '../engine/animation';
import { useDreamStore } from '../store/dreamStore';
import { exportImage } from './exportImage';
import {
  downloadBlob,
  exportAnimationWebM,
  exportSpriteSheet,
  videoDurationSeconds,
  videoFileName,
} from './exportAnimation';

type Format = 'png' | 'jpeg' | 'webm' | 'sprite';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const [format, setFormat] = useState<Format>('png');
  const [quality, setQuality] = useState(92);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doc = useDreamStore((s) => s.doc);
  const animated = doc.frames !== undefined;
  const fps = animationSettingsOf(doc).fps;

  const doExport = async () => {
    if (format === 'webm') {
      setError(null);
      setProgress('Starting…');
      try {
        const blob = await exportAnimationWebM(doc, {
          fps,
          onProgress: (done, total) => setProgress(`Frame ${done} of ${total}…`),
        });
        downloadBlob(blob, videoFileName(doc.name));
        onClose();
      } catch (err) {
        setProgress(null);
        setError(err instanceof Error ? err.message : 'Export failed.');
      }
      return;
    }
    if (format === 'sprite') {
      exportSpriteSheet(doc);
      onClose();
      return;
    }
    exportImage(doc, { format, quality: quality / 100 });
    onClose();
  };

  const formats: { id: Format; label: string }[] = [
    { id: 'png', label: 'PNG' },
    { id: 'jpeg', label: 'JPEG' },
    ...(animated
      ? ([
          { id: 'webm', label: 'WebM video' },
          { id: 'sprite', label: 'Sprite sheet' },
        ] as const)
      : []),
  ];

  return (
    <div className="dialog-backdrop" onClick={progress ? undefined : onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Export"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">Export</h2>

        <div className="field">
          <span>Format</span>
          <div className="preset-grid">
            {formats.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`btn preset${format === id ? ' active' : ''}`}
                onClick={() => setFormat(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {format === 'jpeg' && (
          <label className="option-row">
            <span className="option-label">Quality</span>
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
            Records {doc.frames?.length ?? 0} frames at {fps} fps — about{' '}
            {videoDurationSeconds(doc, fps).toFixed(1)} seconds of video. Keep this tab in front
            while it records.
          </p>
        )}

        {format === 'sprite' && (
          <p className="dialog-note">All frames in one PNG grid — handy for games and sharing.</p>
        )}

        {progress && <p className="dialog-note">Recording… {progress}</p>}
        {error && <p className="dialog-note">{error}</p>}

        <div className="dialog-actions">
          <button className="btn" onClick={onClose} disabled={progress !== null}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => void doExport()}
            disabled={progress !== null}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
