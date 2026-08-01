/**
 * Top toolbar: identity, file operations, history — plus the voice
 * command mic, the Little Dreamer (kid mode) star and the settings gear.
 * In kid mode the toolbar shrinks to the few big friendly buttons a child
 * needs; everything else stays one toggle away for the grown-ups.
 *
 * Buttons carry `data-tooltip` (styled CSS tooltips) instead of native
 * `title`; kid mode skips tooltips because spoken names do that job.
 * The Draw/Design/Present switch has a sliding pill, positioned here by
 * measuring the active tab (locale labels vary in width).
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { importImageFiles } from './importImage';
import { saveNow } from './saveNow';
import { useT } from './i18n';
import { useSpeakName } from './useSpeakName';
import { SettingsMenu } from './SettingsMenu';
import { VoiceCommandButton } from './VoiceCommandButton';
import { KID_TOOLS } from './ToolRail';
import { DreamMark, RedoIcon, SparkleIcon, StarIcon, UndoIcon } from './icons';

const MODES = ['draw', 'design', 'present'] as const;

interface ToolbarProps {
  onNew: () => void;
  onOpen: () => void;
  onResize: () => void;
  onExport: () => void;
}

export function Toolbar({ onNew, onOpen, onResize, onExport }: ToolbarProps) {
  const t = useT();
  const speakName = useSpeakName();
  const docName = useDreamStore((s) => s.doc.name);
  const isDirty = useDreamStore((s) => s.isDirty);
  const canUndo = useDreamStore((s) => s.canUndo);
  const canRedo = useDreamStore((s) => s.canRedo);
  const mode = useDreamStore((s) => s.mode);
  const animated = useDreamStore((s) => s.doc.frames !== undefined);
  const aiPanelOpen = useDreamStore((s) => s.aiPanelOpen);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const locale = useUiPrefs((s) => s.locale);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sliding pill under the active mode tab: measure the tab's box relative
  // to the switch (direction-aware, so RTL slides the same way).
  const modeSwitchRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = modeSwitchRef.current;
      const tab = el?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!el || !tab) return;
      const er = el.getBoundingClientRect();
      const tr = tab.getBoundingClientRect();
      const rtl = getComputedStyle(el).direction === 'rtl';
      setThumb({ x: rtl ? er.right - tr.right : tr.left - er.left, w: tr.width });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mode, locale]);

  const toggleKidMode = () => {
    const store = useDreamStore.getState();
    const on = !kidMode;
    useUiPrefs.getState().setKidMode(on);
    if (on) {
      // Land kids somewhere safe: Draw mode with a tool they can see.
      if (store.mode !== 'draw') store.setMode('draw');
      if (!KID_TOOLS.includes(store.tool)) store.setTool('brush');
    }
  };

  const historyButtons = (big: boolean) => (
    <div className="toolbar-group">
      <button
        className={`btn icon-btn${big ? ' kid-toolbar-btn' : ''}`}
        aria-label={t('toolbar.undo')}
        data-tooltip={big ? undefined : t('toolbar.undoTitle')}
        disabled={!canUndo}
        onPointerEnter={() => speakName(t('toolbar.undo'))}
        onFocus={() => speakName(t('toolbar.undo'))}
        onClick={() => useDreamStore.getState().undo()}
      >
        <UndoIcon />
      </button>
      <button
        className={`btn icon-btn${big ? ' kid-toolbar-btn' : ''}`}
        aria-label={t('toolbar.redo')}
        data-tooltip={big ? undefined : t('toolbar.redoTitle')}
        disabled={!canRedo}
        onPointerEnter={() => speakName(t('toolbar.redo'))}
        onFocus={() => speakName(t('toolbar.redo'))}
        onClick={() => useDreamStore.getState().redo()}
      >
        <RedoIcon />
      </button>
    </div>
  );

  const kidToggle = (
    <button
      type="button"
      className={`btn icon-btn${kidMode ? ' primary' : ''}`}
      aria-pressed={kidMode}
      aria-label={t('toolbar.kidMode')}
      data-tooltip={kidMode ? undefined : t('toolbar.kidModeTitle')}
      onClick={toggleKidMode}
    >
      <StarIcon />
    </button>
  );

  if (kidMode) {
    // Little Dreamer toolbar: nothing to read, nothing to get lost in.
    return (
      <header className="toolbar kid-toolbar">
        <div className="toolbar-group">
          <DreamMark className="app-mark" />
          <span className="app-title kid-app-title">{t('app.title')}</span>
        </div>
        {historyButtons(true)}
        <div className="toolbar-group">
          <VoiceCommandButton />
          <button
            type="button"
            className={`btn icon-btn kid-toolbar-btn${aiPanelOpen ? ' primary' : ''}`}
            aria-pressed={aiPanelOpen}
            aria-label={t('kid.ai')}
            onPointerEnter={() => speakName(t('kid.ai'))}
            onFocus={() => speakName(t('kid.ai'))}
            onClick={() => useDreamStore.getState().toggleAiPanel()}
          >
            <SparkleIcon />
          </button>
        </div>
        <div className="toolbar-group toolbar-end">
          {kidToggle}
          <SettingsMenu />
        </div>
      </header>
    );
  }

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <DreamMark className="app-mark" />
        <span className="app-title">{t('app.title')}</span>
        <span className="doc-name" title={docName}>
          {docName}
          {isDirty ? ' •' : ''}
        </span>
      </div>

      <div className="toolbar-group">
        <button className="btn" onClick={onNew}>
          {t('toolbar.new')}
        </button>
        <button className="btn" onClick={onOpen}>
          {t('toolbar.open')}
        </button>
        <button className="btn" onClick={() => void saveNow()}>
          {t('toolbar.save')}
        </button>
        <button className="btn" onClick={() => fileInputRef.current?.click()}>
          {t('toolbar.import')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void importImageFiles(e.target.files ?? []);
            e.target.value = '';
          }}
        />
        <button className="btn" onClick={onResize}>
          {t('toolbar.resize')}
        </button>
        <button className="btn" onClick={onExport}>
          {t('toolbar.export')}
        </button>
      </div>

      <div className="toolbar-group">
        <div
          className="mode-switch"
          role="tablist"
          aria-label={t('toolbar.mode')}
          ref={modeSwitchRef}
        >
          {thumb && thumb.w > 0 && (
            <span
              className="mode-thumb"
              style={{ insetInlineStart: thumb.x, width: thumb.w }}
              aria-hidden="true"
            />
          )}
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`mode-tab${mode === m ? ' active' : ''}`}
              onClick={() => useDreamStore.getState().setMode(m)}
            >
              {t(`toolbar.${m}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`btn${animated ? ' primary' : ''}`}
          aria-pressed={animated}
          data-tooltip={t('toolbar.animateTitle')}
          onClick={() => useDreamStore.getState().toggleAnimation()}
        >
          {t('toolbar.animate')}
        </button>
        <button
          type="button"
          className={`btn icon-btn${aiPanelOpen ? ' primary' : ''}`}
          aria-pressed={aiPanelOpen}
          aria-label={t('toolbar.ai')}
          data-tooltip={t('toolbar.aiTitle')}
          onClick={() => useDreamStore.getState().toggleAiPanel()}
        >
          <SparkleIcon />
        </button>
        <VoiceCommandButton />
      </div>

      {historyButtons(false)}

      <div className="toolbar-group toolbar-end">
        {kidToggle}
        <SettingsMenu />
      </div>
    </header>
  );
}
