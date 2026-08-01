import { useEffect, useState } from 'react';
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts';
import { useAutosave, useRestoreLastDocument } from './ui/usePersistence';
import { useImagePaste } from './ui/useImagePaste';
import { useDreamStore } from './store/dreamStore';
import { useUiPrefs } from './store/uiPrefs';
import { isRtl } from './ui/i18n';
import { Toolbar } from './ui/Toolbar';
import { ToolRail } from './ui/ToolRail';
import { CanvasViewport } from './ui/CanvasViewport';
import { ToolOptionsPanel } from './ui/ToolOptionsPanel';
import { DesignPanel } from './ui/DesignPanel';
import { ComponentsPanel } from './ui/ComponentsPanel';
import { AdjustPanel } from './ui/AdjustPanel';
import { AiPanel } from './ui/AiPanel';
import { KidPanel } from './ui/KidPanel';
import { LayersPanel } from './ui/LayersPanel';
import { StatusBar } from './ui/StatusBar';
import { TimelineBar } from './ui/TimelineBar';
import { PresentView } from './ui/PresentView';
import { NewDocumentDialog } from './ui/NewDocumentDialog';
import { OpenDialog } from './ui/OpenDialog';
import { ResizeDialog } from './ui/ResizeDialog';
import { ExportDialog } from './ui/ExportDialog';

type Dialog = 'new' | 'open' | 'resize' | 'export' | null;

export default function App() {
  const [dialog, setDialog] = useState<Dialog>(null);
  const mode = useDreamStore((s) => s.mode);
  const aiPanelOpen = useDreamStore((s) => s.aiPanelOpen);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const locale = useUiPrefs((s) => s.locale);

  useKeyboardShortcuts();
  useAutosave();
  useRestoreLastDocument();
  useImagePaste();

  // Language direction follows the locale (Arabic mirrors the whole shell).
  useEffect(() => {
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  // Present mode replaces the whole editor: slides only, no editing.
  if (mode === 'present') return <PresentView />;

  return (
    <div className={`app${kidMode ? ' kid-mode' : ''}`}>
      <Toolbar
        onNew={() => setDialog('new')}
        onOpen={() => setDialog('open')}
        onResize={() => setDialog('resize')}
        onExport={() => setDialog('export')}
      />
      <div className="app-body">
        <ToolRail />
        <CanvasViewport />
        {kidMode ? (
          <KidPanel />
        ) : (
          <aside className="side-panel">
            {aiPanelOpen && <AiPanel />}
            {mode === 'design' && (
              <>
                <DesignPanel />
                <ComponentsPanel />
              </>
            )}
            <ToolOptionsPanel />
            <AdjustPanel />
            <LayersPanel />
          </aside>
        )}
      </div>
      <TimelineBar />
      <StatusBar />
      {dialog === 'new' && <NewDocumentDialog onClose={() => setDialog(null)} />}
      {dialog === 'open' && <OpenDialog onClose={() => setDialog(null)} />}
      {dialog === 'resize' && <ResizeDialog onClose={() => setDialog(null)} />}
      {dialog === 'export' && <ExportDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
