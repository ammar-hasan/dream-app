/**
 * AI provider contract.
 *
 * Dream's AI features are bring-your-own-key: any backend that implements
 * this interface can be registered and selected. Providers declare their
 * capabilities up front (not every endpoint can generate or edit images),
 * and the panel degrades gracefully around whatever is missing.
 *
 * Everything is plain data — PixelBuffer in/out, no DOM, no Blobs — so
 * providers and the rule-based feedback engine stay unit-testable in Node.
 * Providers that need to decode/encode image files get that dependency
 * injected (see openai.ts).
 */

import type { Adjustments, PixelBuffer } from '../engine/filters';
import type { DreamDocument, Rect } from '../engine/types';

export interface AICapabilities {
  generateImage: boolean;
  editImage: boolean;
  chat: boolean;
}

export interface AIImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  /** Lets the person stop a remote request without applying a late result. */
  signal?: AbortSignal;
}

export interface AIEditRequest extends AIImageRequest {
  /** The raster to edit (the whole layer, or just the selected region). */
  image: PixelBuffer;
  /** Region of `image` the edit should touch; undefined = the whole image. */
  mask?: Rect;
}

export interface AIImageResult {
  pixels: PixelBuffer;
  prompt: string;
  providerId: string;
}

export interface AIChatMessage {
  /** 'system' lets callers (e.g. code export) steer the conversation. */
  role: 'system' | 'user' | 'assistant';
  text: string;
}

/**
 * A suggestion the panel can apply for the user in one click. `adjust`
 * bakes a filter combo into the active layer; `center-selection` moves the
 * current Design-mode selection to the canvas center. Both go through the
 * store as undoable commands.
 */
export type AISuggestionAction =
  { kind: 'adjust'; adjustments: Partial<Adjustments> } | { kind: 'center-selection' };

export interface AISuggestion {
  text: string;
  /** Present when Dream can do it for you ("Apply" button). */
  action?: AISuggestionAction;
}

export interface AIFeedbackRequest {
  doc: DreamDocument;
  /** Bounds of the current Design-mode selection, if any. */
  selection?: Rect | null;
  question?: string;
  /** Lets the person stop a remote request without applying a late result. */
  signal?: AbortSignal;
}

export interface AIFeedbackResult {
  summary: string;
  suggestions: AISuggestion[];
  providerId: string;
}

export interface AIProvider {
  id: string;
  name: string;
  capabilities: AICapabilities;
  generateImage(request: AIImageRequest): Promise<AIImageResult>;
  editImage(request: AIEditRequest): Promise<AIImageResult>;
  chat(messages: AIChatMessage[], context?: AIFeedbackRequest): Promise<string>;
  getFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResult>;
}
