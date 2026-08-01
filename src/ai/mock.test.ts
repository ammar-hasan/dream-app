/** Mock provider: deterministic scenes, keyword edits, document-aware feedback. */

import { describe, expect, it } from 'vitest';
import { createDocument } from '../engine/document';
import type { DreamDocument, ImageOp } from '../engine/types';
import { MockAIProvider } from './mock';

const provider = new MockAIProvider();

/** A document whose single layer holds one solid-color raster covering the canvas. */
function solidDoc(width: number, height: number, rgb: [number, number, number]): DreamDocument {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  const op: ImageOp = {
    kind: 'image',
    id: 'op-1',
    color: '#000000',
    opacity: 1,
    scale: 1,
    patch: { x: 0, y: 0, width, height, data },
  };
  const doc = createDocument({ width, height });
  return { ...doc, layers: [{ ...doc.layers[0], operations: [op] }] };
}

describe('MockAIProvider.generateImage', () => {
  it('is deterministic: same prompt and size, same pixels', async () => {
    const a = await provider.generateImage({ prompt: 'a starry night', width: 64, height: 48 });
    const b = await provider.generateImage({ prompt: 'a starry night', width: 64, height: 48 });
    expect(a.pixels.data).toEqual(b.pixels.data);
  });

  it('respects the requested size', async () => {
    const result = await provider.generateImage({ prompt: 'forest', width: 32, height: 24 });
    expect(result.pixels.width).toBe(32);
    expect(result.pixels.height).toBe(24);
    expect(result.pixels.data.length).toBe(32 * 24 * 4);
  });

  it('varies with the prompt (night vs day)', async () => {
    const night = await provider.generateImage({ prompt: 'midnight stars', width: 48, height: 48 });
    const day = await provider.generateImage({ prompt: 'sunny meadow', width: 48, height: 48 });
    expect(night.pixels.data).not.toEqual(day.pixels.data);
    // The night sky (top-left pixel) is much darker than the day sky.
    expect(night.pixels.data[0] + night.pixels.data[2]).toBeLessThan(
      day.pixels.data[0] + day.pixels.data[2],
    );
  });
});

describe('MockAIProvider.editImage', () => {
  it('applies the keyword filter (warmer raises red vs blue)', async () => {
    const doc = solidDoc(16, 16, [100, 100, 100]);
    const layer = doc.layers[0];
    const op = layer.operations[0] as ImageOp;
    const result = await provider.editImage({
      image: { data: op.patch.data, width: 16, height: 16 },
      prompt: 'make it warmer',
    });
    expect(result.pixels.data[0]).toBeGreaterThan(result.pixels.data[2]);
  });

  it('honours the mask: only the region changes', async () => {
    const doc = solidDoc(16, 16, [100, 100, 100]);
    const op = doc.layers[0].operations[0] as ImageOp;
    const result = await provider.editImage({
      image: { data: op.patch.data, width: 16, height: 16 },
      prompt: 'make it warmer',
      mask: { x: 0, y: 0, width: 8, height: 8 },
    });
    const at = (x: number, y: number) => (y * 16 + x) * 4;
    // Inside the mask: changed. Outside: untouched gray.
    expect(result.pixels.data[at(4, 4)]).not.toBe(100);
    expect(result.pixels.data[at(12, 12)]).toBe(100);
  });

  it('is deterministic for the same prompt', async () => {
    const doc = solidDoc(16, 16, [100, 120, 140]);
    const op = doc.layers[0].operations[0] as ImageOp;
    const image = { data: op.patch.data, width: 16, height: 16 };
    const a = await provider.editImage({ image, prompt: 'more pop' });
    const b = await provider.editImage({ image, prompt: 'more pop' });
    expect(a.pixels.data).toEqual(b.pixels.data);
  });
});

describe('MockAIProvider.getFeedback', () => {
  it('invites you to start on a blank canvas', async () => {
    const doc = createDocument({ width: 100, height: 100 });
    const result = await provider.getFeedback({ doc });
    expect(result.summary).toMatch(/blank/i);
    expect(result.suggestions).toEqual([]);
  });

  it('references the real document state and offers actionable tips', async () => {
    const doc = solidDoc(100, 100, [20, 40, 160]); // dark cool blue, full coverage
    const result = await provider.getFeedback({ doc });
    expect(result.summary).toMatch(/1 layer/);
    expect(result.summary).toMatch(/cool/i);
    const actions = result.suggestions.map((s) => s.action?.kind).filter(Boolean);
    // Dark + flat + chilly → brightness, contrast and warmth fixes, all automatable.
    expect(actions).toContain('adjust');
    expect(result.suggestions.some((s) => s.action?.kind === 'adjust')).toBe(true);
  });

  it('suggests centering an off-centre selection', async () => {
    const doc = solidDoc(100, 100, [200, 200, 200]);
    const result = await provider.getFeedback({
      doc,
      selection: { x: 0, y: 0, width: 10, height: 10 },
    });
    expect(result.suggestions.some((s) => s.action?.kind === 'center-selection')).toBe(true);
  });

  it('declares full capabilities and never touches the network', () => {
    expect(provider.capabilities).toEqual({
      generateImage: true,
      editImage: true,
      chat: true,
    });
  });
});
