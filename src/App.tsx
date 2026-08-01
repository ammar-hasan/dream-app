import { useState } from 'react';
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts';
import { useAutosave, useRestoreLastDocument } from './ui/usePersistence';
import { Toolbar } from './ui/Toolbar';
import { ToolRail } from './ui/ToolRail';
import { CanvasViewport } from './ui/CanvasViewport';
import { ToolOptionsPanel } from './ui/ToolOptionsPanel';
import { LayersPanel } from './ui/LayersPanel';
import { StatusBar } from './ui/StatusBar';
import { NewDocumentDialog } from './ui/NewDocumentDialog';
import { OpenDialog } from './ui/OpenDialog';

type Dialog = 'new' | 'open' | null;

export default function App() {
  const [dialog, setDialog] = useState<Dialog>(null);

  useKeyboardShortcuts();
  useAutosave();
  useRestoreLastDocument();

  return (
    <div className="app">
      <Toolbar onNew={() => setDialog('new')} onOpen={() => setDialog('open')} />
      <div className="app-body">
        <ToolRail />
        <CanvasViewport />
        <aside className="side-panel">
          <ToolOptionsPanel />
          <LayersPanel />
        </aside>
      </div>
      <StatusBar />
      {dialog === 'new' && <NewDocumentDialog onClose={() => setDialog(null)} />}
      {dialog === 'open' && <OpenDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
