/**
 * AI provider contract.
 *
 * Dream's AI features are bring-your-own-key: any backend that implements
 * this interface can be registered and selected. Slice 1 ships only the
 * interface, a deterministic mock, and the registry — no UI yet.
 */

export interface AIImageRequest {
  prompt: string;
  width?: number;
  height?: number;
}

export interface AIEditRequest extends AIImageRequest {
  image: Blob;
}

export interface AIFeedbackRequest {
  image: Blob;
  question?: string;
}

export interface AIImageResult {
  image: Blob;
  prompt: string;
  providerId: string;
}

export interface AIFeedbackResult {
  summary: string;
  suggestions: string[];
  providerId: string;
}

export interface AIProvider {
  id: string;
  name: string;
  generateImage(request: AIImageRequest): Promise<AIImageResult>;
  editImage(request: AIEditRequest): Promise<AIImageResult>;
  getFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResult>;
}
