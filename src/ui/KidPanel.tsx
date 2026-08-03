/**
 * Little Dreamer right panel: giant Undo/Redo, a big friendly AI button
 * (opens the Create tab — "talk to Dream!"), and a play button when the
 * drawing has frames. No layers, no design panels, nothing to get lost in.
 */

import { lazy, Suspense } from 'react';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';
import { useSpeakName } from './useSpeakName';
import { StampPicker } from './StampPicker';
import { PauseIcon, PlayIcon, RedoIcon, SparkleIcon, StoryIcon, UndoIcon } from './icons';

const AiPanel = lazy(async () => {
  const module = await import('./AiPanel');
  return { default: module.AiPanel };
});

export function KidPanel() {
  const t = useT();
  const speakName = useSpeakName();
  const canUndo = useDreamStore((s) => s.canUndo);
  const canRedo = useDreamStore((s) => s.canRedo);
  const hasFrames = useDreamStore((s) => !!s.doc.frames && s.doc.frames.length > 0);
  const playing = useDreamStore((s) => s.playing);
  const aiPanelOpen = useDreamStore((s) => s.aiPanelOpen);
  const tool = useDreamStore((s) => s.tool);

  const speak = (key: string) => () => speakName(t(key));

  return (
    <aside className="side-panel kid-panel">
      <div className="kid-actions">
        <button
          type="button"
          className="btn kid-big-btn"
          aria-label={t('toolbar.undo')}
          disabled={!canUndo}
          onPointerEnter={speak('kid.undo')}
          onFocus={speak('kid.undo')}
          onClick={() => useDreamStore.getState().undo()}
        >
          <UndoIcon />
          <span>{t('kid.undo')}</span>
        </button>
        <button
          type="button"
          className="btn kid-big-btn"
          aria-label={t('toolbar.redo')}
          disabled={!canRedo}
          onPointerEnter={speak('kid.redo')}
          onFocus={speak('kid.redo')}
          onClick={() => useDreamStore.getState().redo()}
        >
          <RedoIcon />
          <span>{t('kid.redo')}</span>
        </button>

        {hasFrames && (
          <button
            type="button"
            className={`btn kid-big-btn${playing ? ' primary' : ''}`}
            aria-label={playing ? t('kid.stop') : t('kid.play')}
            aria-pressed={playing}
            onPointerEnter={speak(playing ? 'kid.stop' : 'kid.play')}
            onFocus={speak(playing ? 'kid.stop' : 'kid.play')}
            onClick={() => useDreamStore.getState().togglePlay()}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
            <span>{playing ? t('kid.stop') : t('kid.play')}</span>
          </button>
        )}

        <button
          type="button"
          className="btn kid-big-btn kid-story-btn"
          aria-label={t('storyboard.kid')}
          onPointerEnter={speak('storyboard.kid')}
          onFocus={speak('storyboard.kid')}
          onClick={() => useDreamStore.getState().openStoryboard()}
        >
          <StoryIcon />
          <span>{t('storyboard.kid')}</span>
        </button>

        <button
          type="button"
          className={`btn kid-big-btn kid-ai-btn${aiPanelOpen ? ' primary' : ''}`}
          aria-label={t('kid.ai')}
          aria-pressed={aiPanelOpen}
          onPointerEnter={speak('kid.ai')}
          onFocus={speak('kid.ai')}
          onClick={() => useDreamStore.getState().toggleAiPanel()}
        >
          <SparkleIcon />
          <span>{t('kid.ai')}</span>
        </button>
      </div>

      {tool === 'stamp' && <StampPicker kid />}

      {aiPanelOpen && (
        <Suspense fallback={null}>
          <AiPanel kid />
        </Suspense>
      )}
    </aside>
  );
}
