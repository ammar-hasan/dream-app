import { useEffect, useRef, useState } from 'react';
import { getActiveProvider, getProvider, setAIDeps, type AIProvider } from '../ai/registry';
import {
  MAX_STORYBOARD_SCENES,
  MAX_STORYBOARD_SCENE_LENGTH,
  MAX_STORY_LENGTH,
  MIN_STORYBOARD_SCENES,
  planStoryboard,
  storyboardImagePrompt,
  type StoryboardPlan,
} from '../ai/storyboard';
import { consumeFreeTry } from '../ai/usage';
import { say } from '../ai/say';
import { useDreamStore, type StoryboardFrameInput } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { decodeImage, encodeImage } from './importImage';
import { DictateButton } from './DictateButton';
import { useT } from './i18n';
import { SoundIcon } from './icons';
import { useSpeakName } from './useSpeakName';

function painterForActiveProvider(): AIProvider {
  const active = getActiveProvider();
  return active.capabilities.generateImage ? active : (getProvider('mock') ?? active);
}

function storyboardCancelled(): Error {
  const error = new Error('Story creation cancelled');
  error.name = 'AbortError';
  return error;
}

function waitForImage<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request;
  if (signal.aborted) return Promise.reject(storyboardCancelled());
  return new Promise<T>((resolve, reject) => {
    const cancel = () => reject(storyboardCancelled());
    signal.addEventListener('abort', cancel, { once: true });
    request.then(
      (value) => {
        signal.removeEventListener('abort', cancel);
        if (signal.aborted) reject(storyboardCancelled());
        else resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', cancel);
        reject(error);
      },
    );
  });
}

export async function paintStoryboard(
  plan: StoryboardPlan,
  provider: AIProvider,
  size: { width: number; height: number },
  onProgress: (done: number, total: number, scene: string) => void = () => {},
  signal?: AbortSignal,
): Promise<StoryboardFrameInput[]> {
  const frames: StoryboardFrameInput[] = [];
  for (let index = 0; index < plan.scenes.length; index += 1) {
    if (signal?.aborted) throw storyboardCancelled();
    const scene = plan.scenes[index];
    onProgress(index, plan.scenes.length, scene.description);
    const result = await waitForImage(
      provider.generateImage({
        prompt: storyboardImagePrompt(plan.story, scene.description, index, plan.scenes.length),
        width: size.width,
        height: size.height,
        signal,
      }),
      signal,
    );
    frames.push({ pixels: result.pixels, caption: scene.description });
  }
  onProgress(
    plan.scenes.length,
    plan.scenes.length,
    plan.scenes[plan.scenes.length - 1]?.description ?? '',
  );
  return frames;
}

export function StoryboardDialog({
  initialPrompt = '',
  onClose,
}: {
  initialPrompt?: string;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useUiPrefs((state) => state.locale);
  const kidMode = useUiPrefs((state) => state.kidMode);
  const speakName = useSpeakName();
  const [story, setStory] = useState(initialPrompt);
  const initialPlan = planStoryboard(initialPrompt, locale);
  const [scenes, setScenes] = useState<string[]>(
    () => initialPlan?.scenes.map((scene) => scene.description) ?? [],
  );
  const [painter, setPainter] = useState<AIProvider>(painterForActiveProvider);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, scene: '' });
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    setAIDeps({ decodeImage, encodeImage });
    setPainter(painterForActiveProvider());
    return () => requestController.current?.abort();
  }, []);

  const applyPlan = (value: string) => {
    const next = planStoryboard(value, locale);
    if (!next) {
      setError(t('storyboard.empty'));
      return false;
    }
    setScenes(next.scenes.map((scene) => scene.description));
    setError(null);
    setCancelled(false);
    return true;
  };

  const plan = () => applyPlan(story);
  const speak = (key: string) => () => speakName(t(key));

  const makeAnimation = async () => {
    const cleanScenes = scenes.map((scene) => scene.trim()).filter(Boolean);
    if (cleanScenes.length < MIN_STORYBOARD_SCENES) {
      setError(t('storyboard.needScenes'));
      return;
    }
    const currentStory = story.trim();
    if (!currentStory) {
      setError(t('storyboard.empty'));
      return;
    }
    if (painter.id === 'mock' && !consumeFreeTry()) {
      setError(t('ai.freeOver'));
      return;
    }

    setBusy(true);
    setError(null);
    setCancelled(false);
    const controller = new AbortController();
    requestController.current = controller;
    const store = useDreamStore.getState();
    const wasAnimated = store.doc.frames !== undefined;
    try {
      const frames = await paintStoryboard(
        {
          story: currentStory,
          scenes: cleanScenes.map((description) => ({ description })),
        },
        painter,
        { width: store.doc.width, height: store.doc.height },
        (done, total, scene) => setProgress({ done, total, scene }),
        controller.signal,
      );
      if (controller.signal.aborted) throw storyboardCancelled();
      store.addStoryboardFrames(frames);
      if (!wasAnimated) store.setAnimation({ fps: 1, loop: true });
      store.play();
      const done = t('storyboard.done');
      const prefs = useUiPrefs.getState();
      if (prefs.voiceFeedback) say(done, { lang: prefs.locale });
      onClose();
    } catch (caught) {
      if (controller.signal.aborted) setCancelled(true);
      else setError(caught instanceof Error && caught.message ? caught.message : t('ai.error'));
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setBusy(false);
    }
  };

  const providerName = t(painter.id === 'mock' ? 'ai.providerMock' : 'ai.providerByok');
  const reviewed = scenes.length >= MIN_STORYBOARD_SCENES;

  return (
    <div className="dialog-backdrop" onClick={busy ? undefined : onClose}>
      <div
        className="dialog storyboard-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('storyboard.title')}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            if (busy) requestController.current?.abort();
            else onClose();
          }
        }}
      >
        <h2 className="dialog-title">{t('storyboard.title')}</h2>
        <p className="dialog-note">{t('storyboard.hint')}</p>

        <label className="field">
          <span>{t('storyboard.story')}</span>
          <div className="storyboard-prompt-row">
            <textarea
              autoFocus={!reviewed}
              rows={3}
              maxLength={MAX_STORY_LENGTH}
              value={story}
              placeholder={t('storyboard.placeholder')}
              disabled={busy}
              onChange={(event) => setStory(event.target.value)}
            />
            <DictateButton
              big
              onText={(value) => {
                setStory(value);
                if (kidMode) applyPlan(value);
              }}
              disabled={busy}
            />
          </div>
        </label>

        {!reviewed ? (
          <button
            type="button"
            className="btn primary storyboard-plan"
            disabled={busy}
            onPointerEnter={speak('storyboard.plan')}
            onFocus={speak('storyboard.plan')}
            onClick={plan}
          >
            {t('storyboard.plan')}
          </button>
        ) : (
          <>
            <div className="storyboard-review-heading">
              <h3>{t('storyboard.review')}</h3>
              <div className="storyboard-review-meta">
                <span>{t('storyboard.count', { count: scenes.length })}</span>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onPointerEnter={speak('storyboard.replan')}
                  onFocus={speak('storyboard.replan')}
                  onClick={plan}
                >
                  {t('storyboard.replan')}
                </button>
              </div>
            </div>
            <p className="dialog-note">{t('storyboard.confirmHint')}</p>
            <ol className="storyboard-scenes">
              {scenes.map((scene, index) => (
                <li
                  key={index}
                  className={
                    busy && index < progress.done
                      ? 'is-done'
                      : busy && progress.done < progress.total && index === progress.done
                        ? 'is-current'
                        : undefined
                  }
                >
                  <span className="storyboard-scene-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <textarea
                    rows={2}
                    maxLength={MAX_STORYBOARD_SCENE_LENGTH}
                    value={scene}
                    aria-label={t('storyboard.frame', { n: index + 1 })}
                    disabled={busy}
                    onChange={(event) =>
                      setScenes((current) =>
                        current.map((value, at) => (at === index ? event.target.value : value)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn icon-btn storyboard-speak"
                    aria-label={t('storyboard.speak', { n: index + 1 })}
                    disabled={busy}
                    onPointerEnter={() => speakName(t('storyboard.speak', { n: index + 1 }))}
                    onFocus={() => speakName(t('storyboard.speak', { n: index + 1 }))}
                    onClick={() => say(scene, { lang: locale })}
                  >
                    <SoundIcon />
                  </button>
                  <button
                    type="button"
                    className="btn icon-btn storyboard-remove"
                    aria-label={t('storyboard.remove', { n: index + 1 })}
                    disabled={busy || scenes.length <= MIN_STORYBOARD_SCENES}
                    onPointerEnter={() => speakName(t('storyboard.remove', { n: index + 1 }))}
                    onFocus={() => speakName(t('storyboard.remove', { n: index + 1 }))}
                    onClick={() => setScenes((current) => current.filter((_, at) => at !== index))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            {scenes.length < MAX_STORYBOARD_SCENES && (
              <button
                type="button"
                className="btn storyboard-add"
                disabled={busy}
                onPointerEnter={speak('storyboard.add')}
                onFocus={speak('storyboard.add')}
                onClick={() => setScenes((current) => [...current, t('storyboard.newScene')])}
              >
                {t('storyboard.add')}
              </button>
            )}
            <p className="dialog-note storyboard-provider">
              {t('storyboard.provider', { provider: providerName, count: scenes.length })}
            </p>
          </>
        )}

        {busy && (
          <div className="ai-progress storyboard-progress" role="status">
            <div
              className="ai-progress-track"
              role="progressbar"
              aria-label={t('storyboard.painting', {
                current: Math.min(progress.done + 1, progress.total),
                total: progress.total,
              })}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
            >
              <span
                style={{
                  transform: `scaleX(${progress.total > 0 ? progress.done / progress.total : 0})`,
                }}
              />
            </div>
            <div className="storyboard-progress-copy">
              <strong>
                {t('storyboard.painting', {
                  current: Math.min(progress.done + 1, progress.total),
                  total: progress.total,
                })}
              </strong>
              <span>{progress.scene}</span>
            </div>
          </div>
        )}
        {cancelled && (
          <p className="ai-notice ok" role="status">
            {t('ai.cancelled')}
          </p>
        )}
        {error && (
          <p className="ai-notice error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button
            type="button"
            className="btn"
            onPointerEnter={speak('common.cancel')}
            onFocus={speak('common.cancel')}
            onClick={busy ? () => requestController.current?.abort() : onClose}
          >
            {t('common.cancel')}
          </button>
          {reviewed && (
            <button
              type="button"
              className="btn primary"
              disabled={busy || scenes.some((scene) => !scene.trim())}
              onPointerEnter={speak('storyboard.make')}
              onFocus={speak('storyboard.make')}
              onClick={() => void makeAnimation()}
            >
              {busy ? t('storyboard.working') : t('storyboard.make')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
