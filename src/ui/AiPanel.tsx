/**
 * The AI panel — Dream's intelligent assistant. Three friendly tabs:
 * Create (prompt → new layer), Edit (prompt → filter the active layer, or
 * just the selected part), Feedback (rule-based or chat-backed critique
 * with one-click "Apply" suggestions). A settings drawer configures BYOK
 * (OpenAI-compatible endpoints); the built-in Dream AI is free with a
 * small daily allowance. Everything lands on the document through the
 * store, so every AI action is undoable.
 */

import { useEffect, useState } from 'react';
import {
  applyAdjustments,
  blitRegion,
  DEFAULT_ADJUSTMENTS,
  extractRegion,
} from '../engine/filters';
import { editRegionForSelection } from '../ai/analyze';
import {
  configureOpenAIProvider,
  getActiveProvider,
  getApiKey,
  getProviderSettings,
  isBYOKActive,
  setActiveProvider,
  setAIDeps,
  type AIProvider,
  type AIProviderSettings,
  type AIFeedbackResult,
  type AISuggestion,
} from '../ai/registry';
import { OpenAICompatibleProvider } from '../ai/openai';
import { consumeFreeTry, freeTriesLeft } from '../ai/usage';
import { isSpeechSupported, startDictation, type DictationHandle } from '../ai/speech';
import { decodeImage } from './importImage';
import { rasterizeLayer } from './rasterize';
import { useDreamStore } from '../store/dreamStore';
import { t, useT } from './i18n';
import { MicIcon, SparkleIcon } from './icons';

type Tab = 'create' | 'edit' | 'feedback';
type Busy = Tab | 'settings' | null;

interface Notice {
  kind: 'error' | 'ok';
  text: string;
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return t('ai.error');
}

/** Mic button that dictates into the prompt box; hidden when unsupported. */
function MicButton({
  onText,
  disabled,
  big = false,
}: {
  onText: (text: string) => void;
  disabled: boolean;
  /** Kid mode: a giant, impossible-to-miss mic. */
  big?: boolean;
}) {
  const t = useT();
  const [listening, setListening] = useState(false);
  const [handle, setHandle] = useState<DictationHandle | null>(null);
  if (!isSpeechSupported()) return null;

  const toggle = () => {
    if (handle) {
      handle.stop();
      setHandle(null);
      setListening(false);
      return;
    }
    const h = startDictation({
      onText,
      onEnd: () => {
        setHandle(null);
        setListening(false);
      },
    });
    if (h) {
      setHandle(h);
      setListening(true);
    }
  };

  return (
    <button
      type="button"
      className={`btn icon-btn${big ? ' kid-mic' : ''}${listening ? ' primary' : ''}`}
      aria-pressed={listening}
      aria-label={listening ? t('ai.micStop') : t('ai.mic')}
      title={listening ? t('ai.micStop') : t('ai.micTitle')}
      disabled={disabled}
      onClick={toggle}
    >
      <MicIcon />
    </button>
  );
}

export function AiPanel({ kid = false }: { kid?: boolean }) {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const selection = useDreamStore((s) => s.selection);
  const layer = doc.layers.find((l) => l.id === activeLayerId);

  const [tab, setTab] = useState<Tab>('create');
  // Kid mode is Create-only: no tabs, no BYOK settings — just talk to Dream.
  const activeTab: Tab = kid ? 'create' : tab;
  const [createPrompt, setCreatePrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [feedback, setFeedback] = useState<AIFeedbackResult | null>(null);
  const [triesLeft, setTriesLeft] = useState(freeTriesLeft());
  const [byok, setByok] = useState(isBYOKActive());
  const [provider, setProvider] = useState<AIProvider>(() => getActiveProvider());

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AIProviderSettings>(() =>
    getProviderSettings('openai-compatible'),
  );
  const [apiKey, setApiKey] = useState(() => getApiKey('openai-compatible'));
  const [testResult, setTestResult] = useState<Notice | null>(null);

  const selectionRegion = editRegionForSelection(doc, layer, selection);
  const canEditSelection = selectionRegion !== null;

  // Hand the registry the browser image decoder; rebuild persisted BYOK
  // providers so image generation keeps working after a reload.
  useEffect(() => {
    setAIDeps({ decodeImage });
  }, []);

  const refreshProvider = () => {
    setProvider(getActiveProvider());
    setByok(isBYOKActive());
    setTriesLeft(freeTriesLeft());
  };

  /** Run one AI action with the free-tier gate, busy state and friendly errors. */
  const runAI = async (kind: Tab, fn: (p: AIProvider) => Promise<void>) => {
    if (busy) return;
    if (!byok && !consumeFreeTry()) {
      setTriesLeft(0);
      setNotice({
        kind: 'error',
        text: t('ai.freeOver'),
      });
      return;
    }
    setBusy(kind);
    setNotice(null);
    try {
      await fn(provider);
      setTriesLeft(freeTriesLeft());
    } catch (error) {
      setNotice({ kind: 'error', text: friendlyError(error) });
    } finally {
      setBusy(null);
    }
  };

  const create = () =>
    runAI('create', async (p) => {
      const prompt = createPrompt.trim();
      if (!prompt) return;
      const result = await p.generateImage({ prompt, width: doc.width, height: doc.height });
      useDreamStore.getState().importImage(result.pixels, prompt.slice(0, 40));
      setCreatePrompt('');
      setNotice({ kind: 'ok', text: t('ai.created') });
    });

  const edit = () =>
    runAI('edit', async (p) => {
      const prompt = editPrompt.trim();
      const store = useDreamStore.getState();
      if (!prompt || !layer || layer.operations.length === 0) return;
      const base = rasterizeLayer(layer, doc.width, doc.height);
      if (!base) throw new Error(t('ai.rasterError'));
      const region = selectedOnly ? editRegionForSelection(doc, layer, selection) : null;
      if (region) {
        const part = extractRegion(base, region);
        const result = await p.editImage({ image: part, prompt });
        blitRegion(base, result.pixels, region.x, region.y);
        store.applyLayerRaster(base, 'AI edit');
      } else {
        const result = await p.editImage({ image: base, prompt });
        store.applyLayerRaster(result.pixels, 'AI edit');
      }
      setEditPrompt('');
      setNotice({ kind: 'ok', text: t('ai.edited') });
    });

  const look = () =>
    runAI('feedback', async (p) => {
      const result = await p.getFeedback({ doc, selection: selectionRegion });
      setFeedback(result);
    });

  const applySuggestion = (suggestion: AISuggestion) => {
    const action = suggestion.action;
    if (!action) return;
    const store = useDreamStore.getState();
    if (action.kind === 'center-selection') {
      store.centerSelection();
      setNotice({ kind: 'ok', text: t('ai.centered') });
      return;
    }
    if (!layer || layer.operations.length === 0) {
      setNotice({
        kind: 'error',
        text: t('ai.tipNeedsLayer'),
      });
      return;
    }
    const base = rasterizeLayer(layer, doc.width, doc.height);
    if (!base) return;
    const merged = { ...DEFAULT_ADJUSTMENTS, ...action.adjustments };
    store.applyLayerRaster(applyAdjustments(base, merged), 'AI touch-up');
    setNotice({ kind: 'ok', text: t('ai.applied') });
  };

  const pickProvider = (id: 'mock' | 'openai-compatible') => {
    try {
      setActiveProvider(id);
    } catch {
      // BYOK provider not configured yet — saving the form registers it
    }
    if (id === 'mock') refreshProvider();
    else setSettingsOpen(true);
  };

  const saveSettings = () => {
    const p = configureOpenAIProvider(settings, apiKey.trim(), { decodeImage });
    setActiveProvider(p.id);
    refreshProvider();
    setNotice({
      kind: 'ok',
      text: t('ai.saved'),
    });
  };

  const testConnection = async () => {
    setBusy('settings');
    setTestResult(null);
    try {
      const p = new OpenAICompatibleProvider(
        {
          baseUrl: settings.baseUrl?.trim() || 'https://api.openai.com/v1',
          model: settings.model?.trim() || 'gpt-4o-mini',
          apiKey: apiKey.trim() || undefined,
          supportsImages: !!settings.supportsImages,
        },
        { decodeImage },
      );
      await p.testConnection();
      setTestResult({ kind: 'ok', text: t('ai.testOk') });
    } catch (error) {
      setTestResult({ kind: 'error', text: friendlyError(error) });
    } finally {
      setBusy(null);
    }
  };

  const capabilityNote = (need: 'generateImage' | 'editImage') => {
    if (provider.capabilities[need]) return null;
    return (
      <p className="ai-note">
        {t(need === 'generateImage' ? 'ai.cannotPaint' : 'ai.cannotEdit', {
          provider: provider.name,
        })}{' '}
        <button type="button" className="ai-link" onClick={() => pickProvider('mock')}>
          {t('ai.switchBack')}
        </button>
      </p>
    );
  };

  return (
    <section className={`panel ai-panel${kid ? ' kid-ai-panel' : ''}`} aria-label={t('toolbar.ai')}>
      <div className="panel-header">
        <h2 className="panel-title">
          <SparkleIcon className="ai-title-icon" /> {t('ai.title')}
        </h2>
        {!kid && (
          <button
            type="button"
            className="btn icon-btn small"
            aria-label={t('ai.close')}
            onClick={() => useDreamStore.getState().toggleAiPanel()}
          >
            ✕
          </button>
        )}
      </div>

      {!byok && (
        <p className="ai-usage">
          {t(triesLeft === 1 ? 'ai.triesLeftOne' : 'ai.triesLeft', { count: triesLeft })}
        </p>
      )}

      {!kid && (
        <div className="mode-switch ai-tabs" role="tablist" aria-label={t('ai.tabs')}>
          {(['create', 'edit', 'feedback'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`mode-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              {t(`ai.${id}`)}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="ai-section">
          <p className="tool-hint">{t('ai.createHint')}</p>
          <div className="ai-prompt-row">
            <textarea
              className="ai-textarea"
              rows={3}
              placeholder={t('ai.createPlaceholder')}
              aria-label={t('ai.promptLabel')}
              value={createPrompt}
              onChange={(e) => setCreatePrompt(e.target.value)}
            />
            <MicButton onText={setCreatePrompt} disabled={busy !== null} big={kid} />
          </div>
          <button
            type="button"
            className="btn primary ai-go"
            disabled={
              busy !== null || createPrompt.trim() === '' || !provider.capabilities.generateImage
            }
            onClick={() => void create()}
          >
            {busy === 'create' ? t('ai.dreaming') : t('ai.makeIt')}
          </button>
          {capabilityNote('generateImage')}
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="ai-section">
          <p className="tool-hint">{t('ai.editHint')}</p>
          <div className="ai-prompt-row">
            <textarea
              className="ai-textarea"
              rows={3}
              placeholder={t('ai.editPlaceholder')}
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
            />
            <MicButton onText={setEditPrompt} disabled={busy !== null} />
          </div>
          <label className="checkbox-field option-row" title={t('ai.selectedOnlyTitle')}>
            <input
              type="checkbox"
              checked={selectedOnly && canEditSelection}
              disabled={!canEditSelection}
              onChange={(e) => setSelectedOnly(e.target.checked)}
            />
            {t('ai.selectedOnly')}
          </label>
          {!canEditSelection && <p className="ai-note">{t('ai.editTip')}</p>}
          <button
            type="button"
            className="btn primary ai-go"
            disabled={
              busy !== null ||
              editPrompt.trim() === '' ||
              !layer ||
              layer.operations.length === 0 ||
              !provider.capabilities.editImage
            }
            onClick={() => void edit()}
          >
            {busy === 'edit' ? t('ai.working') : t('ai.editIt')}
          </button>
          {layer && layer.operations.length === 0 && (
            <p className="ai-note">{t('ai.emptyLayer')}</p>
          )}
          {capabilityNote('editImage')}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="ai-section">
          <p className="tool-hint">{t('ai.feedbackHint')}</p>
          <button
            type="button"
            className="btn primary ai-go"
            disabled={busy !== null}
            onClick={() => void look()}
          >
            {busy === 'feedback' ? t('ai.looking') : t('ai.look')}
          </button>
          {!feedback && busy !== 'feedback' && <p className="ai-note">{t('ai.noFeedback')}</p>}
          {feedback && (
            <div className="ai-chat">
              <div className="ai-bubble">{feedback.summary}</div>
              {feedback.suggestions.map((s, i) => (
                <div className="ai-bubble ai-suggestion" key={i}>
                  <span>{s.text}</span>
                  {s.action && (
                    <button
                      type="button"
                      className="btn small-apply"
                      onClick={() => applySuggestion(s)}
                    >
                      {t('ai.apply')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {notice && (
        <p className={`ai-notice ${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}

      {!kid && (
        <div className="ai-settings">
          <button
            type="button"
            className="ai-link"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            {settingsOpen ? '▾' : '▸'}{' '}
            {t('ai.settingsToggle', {
              provider: t(byok ? 'ai.providerByok' : 'ai.providerMock'),
            })}
          </button>
          {settingsOpen && (
            <div className="ai-settings-body">
              <div className="option-row">
                <span className="option-label">{t('ai.whoHelps')}</span>
                <select
                  className="font-select"
                  value={byok ? 'openai-compatible' : 'mock'}
                  onChange={(e) => pickProvider(e.target.value as 'mock' | 'openai-compatible')}
                >
                  <option value="mock">{t('ai.providerMockFull')}</option>
                  <option value="openai-compatible">{t('ai.providerByokFull')}</option>
                </select>
              </div>
              <label className="option-row">
                <span className="option-label">{t('ai.baseUrl')}</span>
                <input
                  className="ai-input"
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={settings.baseUrl ?? ''}
                  onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                />
              </label>
              <label className="option-row">
                <span className="option-label">{t('ai.model')}</span>
                <input
                  className="ai-input"
                  type="text"
                  placeholder="gpt-4o-mini"
                  value={settings.model ?? ''}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                />
              </label>
              <label className="option-row">
                <span className="option-label">{t('ai.apiKey')}</span>
                <input
                  className="ai-input"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-…"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </label>
              <label className="checkbox-field option-row">
                <input
                  type="checkbox"
                  checked={!!settings.rememberKey}
                  onChange={(e) => setSettings({ ...settings, rememberKey: e.target.checked })}
                />
                {t('ai.rememberKey')}
              </label>
              <label className="checkbox-field option-row">
                <input
                  type="checkbox"
                  checked={!!settings.supportsImages}
                  onChange={(e) => setSettings({ ...settings, supportsImages: e.target.checked })}
                />
                {t('ai.canPaint')}
              </label>
              <div className="option-row">
                <button
                  type="button"
                  className="btn"
                  disabled={busy !== null}
                  onClick={() => void testConnection()}
                >
                  {busy === 'settings' ? t('ai.sayingHi') : t('ai.testConnection')}
                </button>
                <button type="button" className="btn primary" onClick={saveSettings}>
                  {t('common.save')}
                </button>
              </div>
              {testResult && (
                <p className={`ai-notice ${testResult.kind}`} role="status">
                  {testResult.text}
                </p>
              )}
              <p className="ai-note">{t('ai.keyNote')}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
