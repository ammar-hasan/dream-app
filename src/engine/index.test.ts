/** The engine barrel is the public API contract — guard its key exports. */

import { describe, expect, it } from 'vitest';
import * as engine from './index';

describe('engine/index (public API barrel)', () => {
  it('exposes the document model types and factories', () => {
    expect(engine.createDocument).toBeTypeOf('function');
    expect(engine.createLayer).toBeTypeOf('function');
    expect(engine.createFrame).toBeTypeOf('function');
  });

  it('exposes the immutable document helpers', () => {
    expect(engine.withLayers).toBeTypeOf('function');
    expect(engine.appendOperation).toBeTypeOf('function');
    expect(engine.insertLayer).toBeTypeOf('function');
    expect(engine.activeFrameOf).toBeTypeOf('function');
  });

  it('exposes history, renderer, filters, color and app export', () => {
    expect(engine.History).toBeTypeOf('function');
    expect(engine.renderDocument).toBeTypeOf('function');
    expect(engine.applyAdjustments).toBeTypeOf('function');
    expect(engine.cssColor).toBeTypeOf('function');
    expect(engine.buildAppExportData).toBeTypeOf('function');
    expect(engine.buildAppHtml).toBeTypeOf('function');
  });

  it('exposes the .dream project file format', () => {
    expect(engine.DREAM_PROJECT_FORMAT).toBe('dream-project');
    expect(engine.DREAM_PROJECT_VERSION).toBe(1);
    expect(engine.encodeProject).toBeTypeOf('function');
    expect(engine.decodeProject).toBeTypeOf('function');
  });
});
