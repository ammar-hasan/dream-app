import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts';
import { useAutosave, useRestoreLastDocument } from './ui/usePersistence';
import { useImagePaste } from './ui/useImagePaste';
import { useDreamStore } from './store/dreamStore';
import { useUiPrefs } from './store/uiPrefs';
import { isRtl, useT } from './ui/i18n';
import { DreamMark } from './ui/icons';
import { Toolbar } from './ui/Toolbar';
import { ToolRail } from './ui/ToolRail';
import { CanvasViewport } from './ui/CanvasViewport';
import { ToolOptionsPanel } from './ui/ToolOptionsPanel';
import { DesignPanel } from './ui/DesignPanel';
import { ComponentsPanel } from './ui/ComponentsPanel';
import { HotspotsPanel } from './ui/HotspotsPanel';
import { LinkDialog } from './ui/LinkDialog';
import { AdjustPanel } from './ui/AdjustPanel';
import { AiPanel } from './ui/AiPanel';
import { KidPanel } from './ui/KidPanel';
import { LayersPanel } from './ui/LayersPanel';
import { StatusBar } from './ui/StatusBar';
import { TimelineBar } from './ui/TimelineBar';
import { PlayView } from './ui/PlayView';
import { PlayPanel } from './ui/PlayPanel';
import { NewDocumentDialog } from './ui/NewDocumentDialog';
import { OpenDialog } from './ui/OpenDialog';
import { ResizeDialog } from './ui/ResizeDialog';
import { UpdateToast } from './ui/UpdateToast';
import { StoryboardDialog } from './ui/StoryboardDialog';

type Dialog = 'new' | 'open' | 'resize' | 'export' | null;

const PresentView = lazy(async () => {
  const module = await import('./ui/PresentView');
  return { default: module.PresentView };
});

const ExportDialog = lazy(async () => {
  const module = await import('./ui/ExportDialog');
  return { default: module.ExportDialog };
});

export default function App({ initialShareError = false }: { initialShareError?: boolean }) {
  const t = useT();
  const [dialog, setDialog] = useState<Dialog>(null);
  // Splash: shown until the last-document restore settles, then fades out.
  const [splash, setSplash] = useState<'show' | 'fade' | 'gone'>('show');
  const mode = useDreamStore((s) => s.mode);
  const pendingHotspot = useDreamStore((s) => s.pendingHotspot);
  const aiPanelOpen = useDreamStore((s) => s.aiPanelOpen);
  const storyboardOpen = useDreamStore((s) => s.storyboardOpen);
  const storyboardPrompt = useDreamStore((s) => s.storyboardPrompt);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const theme = useUiPrefs((s) => s.theme);
  const comfortMode = useUiPrefs((s) => s.comfortMode);
  const locale = useUiPrefs((s) => s.locale);

  useKeyboardShortcuts();
  useAutosave();
  useRestoreLastDocument(useCallback(() => setSplash('fade'), []));
  useImagePaste();

  // Language direction follows the locale (Arabic mirrors the whole shell).
  useEffect(() => {
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  // Color theme: a data-attribute remap of the design tokens in app.css.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#14161f' : '#eef0f6');
  }, [theme]);

  // Comfort mode: bigger text/targets + higher contrast via `html[data-comfort]`.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-comfort', comfortMode);
  }, [comfortMode]);

  // Let the fade-out finish before unmounting the splash.
  useEffect(() => {
    if (splash !== 'fade') return;
    const timer = setTimeout(() => setSplash('gone'), 340);
    return () => clearTimeout(timer);
  }, [splash]);

  // Present mode replaces the whole editor: slides only, no editing.
  if (mode === 'present') {
    return (
      <Suspense fallback={<div className="present-view" />}>
        <PresentView />
      </Suspense>
    );
  }

  return (
    <div className={`app${kidMode ? ' kid-mode' : ''}`}>
      {initialShareError && (
        <div className="share-load-error" role="alert">
          {t('share.invalid')}
        </div>
      )}
      <Toolbar
        onNew={() => setDialog('new')}
        onOpen={() => setDialog('open')}
        onResize={() => setDialog('resize')}
        onExport={() => setDialog('export')}
      />
      <div className="app-body">
        {mode !== 'play' && <ToolRail />}
        {mode === 'play' ? <PlayView /> : <CanvasViewport />}
        {kidMode ? (
          mode !== 'play' && <KidPanel />
        ) : (
          <aside className="side-panel">
            {aiPanelOpen && <AiPanel />}
            {mode === 'design' && (
              <>
                <DesignPanel />
                <HotspotsPanel />
                <ComponentsPanel />
              </>
            )}
            {mode === 'play' ? (
              <PlayPanel />
            ) : (
              <>
                <ToolOptionsPanel />
                <AdjustPanel />
                <LayersPanel />
              </>
            )}
          </aside>
        )}
      </div>
      <TimelineBar />
      <StatusBar />
      {dialog === 'new' && <NewDocumentDialog onClose={() => setDialog(null)} />}
      {dialog === 'open' && <OpenDialog onClose={() => setDialog(null)} />}
      {dialog === 'resize' && <ResizeDialog onClose={() => setDialog(null)} />}
      {dialog === 'export' && (
        <Suspense fallback={null}>
          <ExportDialog onClose={() => setDialog(null)} />
        </Suspense>
      )}
      {pendingHotspot && <LinkDialog />}
      {storyboardOpen && (
        <StoryboardDialog
          key={storyboardPrompt}
          initialPrompt={storyboardPrompt}
          onClose={() => useDreamStore.getState().closeStoryboard()}
        />
      )}
      <UpdateToast />
      {splash !== 'gone' && (
        <div className={`splash${splash === 'fade' ? ' fade' : ''}`} aria-hidden="true">
          <DreamMark className="splash-mark" />
        </div>
      )}
    </div>
  );
}
