import { beforeEach, describe, expect, it } from 'vitest';
import { enableAnimation, blankFrame } from './animation';
import { createDocument } from './document';
import { History, addFrameCommand, addHotspotCommand, removeFrameCommand } from './history';
import { createHotspot } from './hotspots';
import { buildAppExportData, buildAppHtml, escapeHtml } from './appExport';
import type { DreamDocument } from './types';

const IMAGES = ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'];

let doc: DreamDocument;

beforeEach(() => {
  const history = new History();
  doc = enableAnimation(createDocument({ width: 200, height: 100, name: 'My App' }));
  doc = history.execute(doc, addFrameCommand(doc, blankFrame()));
  const target = doc.frames?.[1].id ?? '';
  const source = doc.frames?.[0].id ?? '';
  const hotspot = createHotspot({ x: 20, y: 10, width: 50, height: 25 }, target, 'fade');
  doc = history.execute(doc, addHotspotCommand(source, hotspot));
});

describe('buildAppExportData', () => {
  it('converts hotspot rects to fractions of the frame size', () => {
    const data = buildAppExportData(doc, IMAGES);
    expect(data.title).toBe('My App');
    expect(data.width).toBe(200);
    expect(data.height).toBe(100);
    expect(data.frames).toHaveLength(2);
    expect(data.frames[0].image).toBe(IMAGES[0]);
    expect(data.frames[0].hotspots).toEqual([
      { x: 0.1, y: 0.1, width: 0.25, height: 0.25, target: 1, transition: 'fade' },
    ]);
    expect(data.frames[1].hotspots).toEqual([]);
  });

  it('drops broken hotspots and clamps rects to the frame', () => {
    const history = new History();
    // Rebuild history on the current doc so the frame removal is registered.
    doc = history.execute(doc, removeFrameCommand(doc, doc.frames?.[1].id ?? ''));
    const stray = createHotspot(
      { x: -40, y: 90, width: 400, height: 50 },
      doc.frames?.[0].id ?? '',
    );
    doc = history.execute(doc, addHotspotCommand(doc.frames?.[0].id ?? '', stray));

    const data = buildAppExportData(doc, [IMAGES[0]]);
    expect(data.frames[0].hotspots).toEqual([
      { x: 0, y: 0.9, width: 1, height: 0.5, target: 0, transition: 'fade' },
    ]);
  });

  it('clamps the start index into range', () => {
    expect(buildAppExportData(doc, IMAGES, 99).startIndex).toBe(1);
    expect(buildAppExportData(doc, IMAGES, -3).startIndex).toBe(0);
  });
});

describe('escapeHtml', () => {
  it('escapes markup, quotes and ampersands', () => {
    expect(escapeHtml('<script>"x"&\'')).toBe('&lt;script&gt;&quot;x&quot;&amp;&#39;');
  });
});

describe('buildAppHtml', () => {
  it('embeds every frame image and hotspot with percentage geometry', () => {
    const html = buildAppHtml(buildAppExportData(doc, IMAGES));
    expect(html).toContain(`src="${IMAGES[0]}"`);
    expect(html).toContain(`src="${IMAGES[1]}"`);
    expect(html).toContain('left:10.000%;top:10.000%;width:25.000%;height:25.000%');
    expect(html).toContain('data-target="1"');
    expect(html).toContain('data-fx="fade"');
    expect(html).toContain('aria-label="Go to screen 2"');
    expect((html.match(/class="screen"/g) ?? []).length).toBe(2);
  });

  it('escapes the document title', () => {
    const evil = { ...doc, name: '<script>alert(1)</script>' };
    const html = buildAppHtml(buildAppExportData(evil, IMAGES));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('is fully self-contained: no external URLs', () => {
    const html = buildAppHtml(buildAppExportData(doc, IMAGES));
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<link');
    expect(html).not.toContain('src=".');
    expect(html).toContain('Made with Dream');
  });

  it('honors the start index', () => {
    const html = buildAppHtml(buildAppExportData(doc, IMAGES, 1));
    expect(html).toContain('START=1');
  });
});
