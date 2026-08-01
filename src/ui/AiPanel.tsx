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
import { MicIcon, SparkleIcon } from './icons';

type Tab = 'create' | 'edit' | 'feedback';
type Busy = Tab | 'settings' | null;

interface Notice {
  kind: 'error' | 'ok';
  text: string;
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Hmm, that did not work. Try again?';
}

/** Mic button that dictates into the prompt box; hidden when unsupported. */
function MicButton({ onText, disabled }: { onText: (text: string) => void; disabled: boolean }) {
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
      className={`btn icon-btn${listening ? ' primary' : ''}`}
      aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : 'Say it'}
      title={listening ? 'Stop listening' : 'Say it out loud'}
      disabled={disabled}
      onClick={toggle}
    >
      <MicIcon />
    </button>
  );
}

export function AiPanel() {
  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const selection = useDreamStore((s) => s.selection);
  const layer = doc.layers.find((l) => l.id === activeLayerId);

  const [tab, setTab] = useState<Tab>('create');
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
        text: 'That is all the free dreams for today! Add your own AI in Settings below for unlimited magic.',
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
      setNotice({ kind: 'ok', text: 'Ta-da! Your picture is on a brand-new layer.' });
    });

  const edit = () =>
    runAI('edit', async (p) => {
      const prompt = editPrompt.trim();
      const store = useDreamStore.getState();
      if (!prompt || !layer || layer.operations.length === 0) return;
      const base = rasterizeLayer(layer, doc.width, doc.height);
      if (!base) throw new Error('I could not look at your layer — try again?');
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
      setNotice({ kind: 'ok', text: 'Done! Undo is there if you liked it better before.' });
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
      setNotice({ kind: 'ok', text: 'Centered! Looking good.' });
      return;
    }
    if (!layer || layer.operations.length === 0) {
      setNotice({
        kind: 'error',
        text: 'This tip works on the active layer — pick a layer with something on it first.',
      });
      return;
    }
    const base = rasterizeLayer(layer, doc.width, doc.height);
    if (!base) return;
    const merged = { ...DEFAULT_ADJUSTMENTS, ...action.adjustments };
    store.applyLayerRaster(applyAdjustments(base, merged), 'AI touch-up');
    setNotice({ kind: 'ok', text: 'Applied! Undo brings back the old look.' });
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
      text: 'Saved! Your own AI is connected — unlimited use, no daily counter.',
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
      setTestResult({ kind: 'ok', text: 'It works! Your AI said hello back.' });
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
        {provider.name} cannot {need === 'generateImage' ? 'paint pictures' : 'edit pictures'}.
        Dream AI can —{' '}
        <button type="button" className="ai-link" onClick={() => pickProvider('mock')}>
          switch back
        </button>
        .
      </p>
    );
  };

  return (
    <section className="panel ai-panel" aria-label="AI helper">
      <div className="panel-header">
        <h2 className="panel-title">
          <SparkleIcon className="ai-title-icon" /> Dream AI
        </h2>
        <button
          type="button"
          className="btn icon-btn small"
          aria-label="Close AI helper"
          onClick={() => useDreamStore.getState().toggleAiPanel()}
        >
          ✕
        </button>
      </div>

      {!byok && (
        <p className="ai-usage">
          {triesLeft} free {triesLeft === 1 ? 'try' : 'tries'} left today
        </p>
      )}

      <div className="mode-switch ai-tabs" role="tablist" aria-label="AI tools">
        {(['create', 'edit', 'feedback'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`mode-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'create' ? 'Create' : t === 'edit' ? 'Edit' : 'Feedback'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <div className="ai-section">
          <p className="tool-hint">Tell me your dream and I’ll sketch it.</p>
          <div className="ai-prompt-row">
            <textarea
              className="ai-textarea"
              rows={3}
              placeholder="A sleepy fox under a starry sky…"
              value={createPrompt}
              onChange={(e) => setCreatePrompt(e.target.value)}
            />
            <MicButton onText={setCreatePrompt} disabled={busy !== null} />
          </div>
          <button
            type="button"
            className="btn primary ai-go"
            disabled={
              busy !== null || createPrompt.trim() === '' || !provider.capabilities.generateImage
            }
            onClick={() => void create()}
          >
            {busy === 'create' ? 'Dreaming…' : 'Make it!'}
          </button>
          {capabilityNote('generateImage')}
        </div>
      )}

      {tab === 'edit' && (
        <div className="ai-section">
          <p className="tool-hint">
            Tell me how to change your picture — “warmer”, “dreamy”, “more pop”.
          </p>
          <div className="ai-prompt-row">
            <textarea
              className="ai-textarea"
              rows={3}
              placeholder="Make it warmer and softer…"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
            />
            <MicButton onText={setEditPrompt} disabled={busy !== null} />
          </div>
          <label className="checkbox-field option-row" title="Uses the Design-mode selection box">
            <input
              type="checkbox"
              checked={selectedOnly && canEditSelection}
              disabled={!canEditSelection}
              onChange={(e) => setSelectedOnly(e.target.checked)}
            />
            Selected part only
          </label>
          {!canEditSelection && (
            <p className="ai-note">
              Tip: pick something with the Select tool in Design mode to edit just that part.
            </p>
          )}
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
            {busy === 'edit' ? 'Working…' : 'Edit it!'}
          </button>
          {layer && layer.operations.length === 0 && (
            <p className="ai-note">
              The active layer is empty — draw or pick a layer with something on it.
            </p>
          )}
          {capabilityNote('editImage')}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="ai-section">
          <p className="tool-hint">
            I’ll take a kind look and give you ideas you can use right away.
          </p>
          <button
            type="button"
            className="btn primary ai-go"
            disabled={busy !== null}
            onClick={() => void look()}
          >
            {busy === 'feedback' ? 'Taking a good look…' : 'Look at my design'}
          </button>
          {!feedback && busy !== 'feedback' && (
            <p className="ai-note">Nothing yet — press the button and I’ll share what I see.</p>
          )}
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
                      Apply
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

      <div className="ai-settings">
        <button
          type="button"
          className="ai-link"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          {settingsOpen ? '▾' : '▸'} Settings: {byok ? 'my own AI' : 'Dream AI (built-in)'}
        </button>
        {settingsOpen && (
          <div className="ai-settings-body">
            <div className="option-row">
              <span className="option-label">Who helps</span>
              <select
                className="font-select"
                value={byok ? 'openai-compatible' : 'mock'}
                onChange={(e) => pickProvider(e.target.value as 'mock' | 'openai-compatible')}
              >
                <option value="mock">Dream AI (free, built-in)</option>
                <option value="openai-compatible">My own AI (OpenAI-compatible)</option>
              </select>
            </div>
            <label className="option-row">
              <span className="option-label">Base URL</span>
              <input
                className="ai-input"
                type="text"
                placeholder="https://api.openai.com/v1"
                value={settings.baseUrl ?? ''}
                onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              />
            </label>
            <label className="option-row">
              <span className="option-label">Model</span>
              <input
                className="ai-input"
                type="text"
                placeholder="gpt-4o-mini"
                value={settings.model ?? ''}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              />
            </label>
            <label className="option-row">
              <span className="option-label">API key</span>
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
              Remember key on this device
            </label>
            <label className="checkbox-field option-row">
              <input
                type="checkbox"
                checked={!!settings.supportsImages}
                onChange={(e) => setSettings({ ...settings, supportsImages: e.target.checked })}
              />
              This AI can also paint images
            </label>
            <div className="option-row">
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={() => void testConnection()}
              >
                {busy === 'settings' ? 'Saying hi…' : 'Test connection'}
              </button>
              <button type="button" className="btn primary" onClick={saveSettings}>
                Save
              </button>
            </div>
            {testResult && (
              <p className={`ai-notice ${testResult.kind}`} role="status">
                {testResult.text}
              </p>
            )}
            <p className="ai-note">
              Keys live only in this tab’s memory unless “remember key” is ticked. They are never
              sent anywhere but your AI.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
