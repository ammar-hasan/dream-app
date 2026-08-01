import { useState } from 'react';
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts';
import { useAutosave, useRestoreLastDocument } from './ui/usePersistence';
import { useImagePaste } from './ui/useImagePaste';
import { useDreamStore } from './store/dreamStore';
import { Toolbar } from './ui/Toolbar';
import { ToolRail } from './ui/ToolRail';
import { CanvasViewport } from './ui/CanvasViewport';
import { ToolOptionsPanel } from './ui/ToolOptionsPanel';
import { DesignPanel } from './ui/DesignPanel';
import { ComponentsPanel } from './ui/ComponentsPanel';
import { AdjustPanel } from './ui/AdjustPanel';
import { AiPanel } from './ui/AiPanel';
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

  useKeyboardShortcuts();
  useAutosave();
  useRestoreLastDocument();
  useImagePaste();

  // Present mode replaces the whole editor: slides only, no editing.
  if (mode === 'present') return <PresentView />;

  return (
    <div className="app">
      <Toolbar
        onNew={() => setDialog('new')}
        onOpen={() => setDialog('open')}
        onResize={() => setDialog('resize')}
        onExport={() => setDialog('export')}
      />
      <div className="app-body">
        <ToolRail />
        <CanvasViewport />
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
