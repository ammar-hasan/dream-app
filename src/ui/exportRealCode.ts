/**
 * "Real code (AI)" export flow: build the structured app description, then
 * either ask the active BYOK chat provider to write the single-file app
 * (extracting and validating the HTML from its reply) or — with the built-in
 * Dream AI — generate the deterministic local template. Counts against the
 * daily free tier like every other Dream AI action; BYOK is unlimited.
 *
 * The generation half is DOM-free and dependency-injectable for tests; only
 * `exportRealCodeHtml` touches the browser (the download).
 */

import {
  buildAppDescription,
  buildMakeRealPrompt,
  buildTemplateAppHtml,
  extractHtmlFromReply,
  validateGeneratedHtml,
} from '../ai/makeReal';
import { getActiveProvider, isBYOKActive, type AIProvider } from '../ai/registry';
import { consumeFreeTry } from '../ai/usage';
import type { DreamDocument } from '../engine/types';
import type { RasterPatch } from '../engine/types';
import { downloadBlob } from './exportAnimation';
import { browserRasterCodec } from './dreamFile';
import { t } from './i18n';

export function codeFileName(docName: string): string {
  return `${docName.trim() || 'dream'}-code.html`;
}

export interface RealCodeDeps {
  /** Defaults to the registry's active provider. */
  provider?: AIProvider;
  /** Defaults to a browser download. */
  download?: (blob: Blob, fileName: string) => void;
  /** Defaults to the browser PNG codec; tests inject a deterministic encoder. */
  encodeRaster?: (patch: RasterPatch) => Promise<string>;
  /** Lets the export dialog stop remote generation and reject late results. */
  signal?: AbortSignal;
  /** Reports honest phases; none of them imply a made-up percentage. */
  onProgress?: (stage: RealCodeStage) => void;
}

export type RealCodeStage = 'preparing' | 'writing' | 'checking';

function throwIfCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error('Code generation cancelled');
  error.name = 'AbortError';
  throw error;
}

async function encodeImageAssets(
  doc: DreamDocument,
  encode: (patch: RasterPatch) => Promise<string>,
): Promise<Record<string, string>> {
  const frames = doc.frames ?? [{ layers: doc.layers }];
  const images = frames.flatMap((frame) =>
    frame.layers.flatMap((layer) =>
      layer.visible ? layer.operations.filter((op) => op.kind === 'image') : [],
    ),
  );
  const assets: Record<string, string> = {};
  try {
    await Promise.all(
      images.map(async (image) => {
        if (!(image.id in assets)) assets[image.id] = await encode(image.patch);
      }),
    );
  } catch {
    throw new Error(t('export.codeImageFailed'));
  }
  return assets;
}

export interface RealCodeResult {
  html: string;
  /** True when the built-in Dream AI template made the code (offline). */
  local: boolean;
}

/**
 * Generate the code without downloading. Throws friendly, ready-to-show
 * errors when the provider can't chat, the reply isn't code, or the code
 * isn't self-contained.
 */
export async function generateRealCodeHtml(
  doc: DreamDocument,
  deps: RealCodeDeps = {},
): Promise<RealCodeResult> {
  const provider = deps.provider ?? getActiveProvider();
  throwIfCancelled(deps.signal);
  deps.onProgress?.('preparing');
  const assets = await encodeImageAssets(doc, deps.encodeRaster ?? browserRasterCodec.encode);
  throwIfCancelled(deps.signal);
  const app = buildAppDescription(doc, assets);
  deps.onProgress?.('writing');
  if (provider.id === 'mock') {
    const html = buildTemplateAppHtml(app);
    throwIfCancelled(deps.signal);
    deps.onProgress?.('checking');
    return { html, local: true };
  }
  if (!provider.capabilities.chat) {
    throw new Error(t('export.codeNoChat'));
  }
  const { system, user } = buildMakeRealPrompt(app);
  const reply = await provider.chat(
    [
      { role: 'system', text: system },
      { role: 'user', text: user },
    ],
    { doc, signal: deps.signal },
  );
  throwIfCancelled(deps.signal);
  deps.onProgress?.('checking');
  const html = extractHtmlFromReply(reply);
  if (!html) throw new Error(t('export.codeNotCode'));
  const check = validateGeneratedHtml(html);
  if (!check.ok) throw new Error(t('export.codeUnsafe'));
  return { html, local: false };
}

/** The full flow: free-tier gate → generate → download. */
export async function exportRealCodeHtml(
  doc: DreamDocument,
  deps: RealCodeDeps = {},
): Promise<{ local: boolean; fileName: string }> {
  throwIfCancelled(deps.signal);
  if (!isBYOKActive() && !consumeFreeTry()) {
    throw new Error(t('ai.freeOver'));
  }
  const { html, local } = await generateRealCodeHtml(doc, deps);
  throwIfCancelled(deps.signal);
  const fileName = codeFileName(doc.name);
  (deps.download ?? downloadBlob)(new Blob([html], { type: 'text/html' }), fileName);
  return { local, fileName };
}
