/**
 * Make-real code export: the app description builder, prompt construction,
 * messy-reply extraction, self-containment validation and the deterministic
 * Dream AI template generator — all on synthetic documents.
 */

import { describe, expect, it } from 'vitest';
import { createDocument, createLayer } from '../engine/document';
import { createHotspot } from '../engine/hotspots';
import type {
  DreamDocument,
  FillOp,
  Frame,
  ImageOp,
  ShapeOp,
  StrokeOp,
  TextOp,
} from '../engine/types';
import {
  buildAppDescription,
  buildMakeRealPrompt,
  buildTemplateAppHtml,
  DREAM_HEADER_COMMENT,
  extractHtmlFromReply,
  validateGeneratedHtml,
} from './makeReal';

function textOp(text: string, x: number, y: number, fontSize = 24): TextOp {
  return {
    kind: 'text',
    id: `text-${x}-${y}`,
    color: '#1f2937',
    opacity: 1,
    position: { x, y },
    text,
    fontSize,
    fontFamily: 'sans-serif',
  };
}

function rectOp(color: string, x: number, y: number, w: number, h: number, fill = true): ShapeOp {
  return {
    kind: 'shape',
    id: `rect-${x}-${y}`,
    color,
    opacity: 1,
    shape: 'rectangle',
    from: { x, y },
    to: { x: x + w, y: y + h },
    size: 3,
    fill,
  };
}

function strokeOp(color: string, x: number, y: number): StrokeOp {
  return {
    kind: 'stroke',
    id: `stroke-${x}-${y}`,
    tool: 'brush',
    color,
    opacity: 1,
    size: 4,
    points: [
      { x, y },
      { x: x + 40, y: y + 30 },
    ],
  };
}

function imageOp(x: number, y: number, w: number, h: number): ImageOp {
  return {
    kind: 'image',
    id: `image-${x}-${y}`,
    color: '#000000',
    opacity: 1,
    scale: 2,
    patch: { x, y, width: w, height: h, data: new Uint8ClampedArray(w * h * 4) },
  };
}

function fillOp(color: string, x: number, y: number, w: number, h: number): FillOp {
  return {
    kind: 'fill',
    id: `fill-${x}-${y}`,
    color,
    opacity: 1,
    origin: { x, y },
    patch: { x, y, width: w, height: h, data: new Uint8ClampedArray(w * h * 4) },
  };
}

/** A two-screen app: a heading + red button on screen 1, linked to screen 2. */
function appDoc(): DreamDocument {
  const base = createDocument({ width: 320, height: 240, background: '#fff8ee' });
  const f1: Frame = {
    id: 'f1',
    layers: [
      createLayer('Screen 1', [
        textOp('Welcome!', 24, 30, 32),
        rectOp('#ef4444', 100, 150, 120, 40),
      ]),
    ],
    hotspots: [createHotspot({ x: 100, y: 150, width: 120, height: 40 }, 'f2', 'slide')],
  };
  const f2: Frame = {
    id: 'f2',
    layers: [createLayer('Screen 2', [textOp('Details', 24, 30), strokeOp('#3b82f6', 50, 100)])],
  };
  return { ...base, name: 'My App', frames: [f1, f2], activeFrameId: 'f2', layers: f2.layers };
}

describe('buildAppDescription', () => {
  it('describes screens, texts, elements and the navigation graph', () => {
    const app = buildAppDescription(appDoc());
    expect(app.name).toBe('My App');
    expect(app.width).toBe(320);
    expect(app.height).toBe(240);
    expect(app.startIndex).toBe(1); // frame 2 is active
    expect(app.screens).toHaveLength(2);

    const [s1, s2] = app.screens;
    expect(s1.name).toBe('Screen 1');
    expect(s1.background).toBe('#fff8ee');
    expect(s1.palette.length).toBeGreaterThan(0);
    expect(s1.texts).toEqual([{ text: 'Welcome!', x: 24, y: 30, fontSize: 32, color: '#1f2937' }]);
    expect(s1.elements).toEqual([
      {
        kind: 'rectangle',
        x: 100,
        y: 150,
        width: 120,
        height: 40,
        color: '#ef4444',
        size: 3,
        filled: true,
      },
    ]);
    expect(s1.links).toEqual([
      { x: 100, y: 150, width: 120, height: 40, target: 1, transition: 'slide' },
    ]);
    expect(s2.elements[0]).toMatchObject({ kind: 'drawing', color: '#3b82f6' });
  });

  it('keeps a structure-only image box when no encoded raster asset is supplied', () => {
    const doc = appDoc();
    doc.frames![0].layers[0] = createLayer('L', [
      imageOp(10, 20, 8, 6),
      fillOp('#22c55e', 0, 0, 320, 240),
    ]);
    const [s1] = buildAppDescription(doc).screens;
    expect(s1.elements).toEqual([
      { kind: 'image', x: 10, y: 20, width: 16, height: 12 }, // scale 2 applied
      { kind: 'fill', x: 0, y: 0, width: 320, height: 240, color: '#22c55e' },
    ]);
    expect(JSON.stringify(s1)).not.toContain('data');
  });

  it('attaches only valid inline PNG assets when supplied by the browser layer', () => {
    const doc = appDoc();
    const image = imageOp(10, 20, 8, 6);
    doc.frames![0].layers[0] = createLayer('L', [image]);
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const element = buildAppDescription(doc, { [image.id]: png }).screens[0].elements[0];
    expect(element).toMatchObject({ kind: 'image', asset: png });

    const unsafe = buildAppDescription(doc, { [image.id]: 'javascript:alert(1)' });
    expect(unsafe.screens[0].elements[0]).not.toHaveProperty('asset');
  });

  it('drops broken hotspots but keeps valid ones', () => {
    const doc = appDoc();
    doc.frames![0].hotspots = [
      createHotspot({ x: 0, y: 0, width: 10, height: 10 }, 'deleted-frame'),
      createHotspot({ x: 5, y: 5, width: 10, height: 10 }, 'f2'),
    ];
    const [s1] = buildAppDescription(doc).screens;
    expect(s1.links).toHaveLength(1);
    expect(s1.links[0].target).toBe(1);
  });

  it('treats a frameless document as a single-screen app', () => {
    const base = createDocument({ width: 100, height: 80 });
    const doc = { ...base, layers: [createLayer('L', [textOp('Hi', 5, 5)])] };
    const app = buildAppDescription(doc);
    expect(app.screens).toHaveLength(1);
    expect(app.startIndex).toBe(0);
    expect(app.screens[0].texts[0].text).toBe('Hi');
  });

  it('stays small on heavy documents (cheap-model budget)', () => {
    const frames: Frame[] = [0, 1, 2, 3].map((i) => ({
      id: `f${i}`,
      layers: [
        createLayer('busy', [
          ...Array.from({ length: 40 }, (_, j) => rectOp('#a855f7', j * 3, j * 2, 20, 20)),
          ...Array.from({ length: 30 }, (_, j) => textOp(`label ${j} `.repeat(10), j, j)),
        ]),
      ],
    }));
    const base = createDocument({ width: 640, height: 480 });
    const app = buildAppDescription({
      ...base,
      frames,
      activeFrameId: 'f0',
      layers: frames[0].layers,
    });
    expect(app.screens[0].elements.length).toBeLessThanOrEqual(12);
    expect(app.screens[0].texts.length).toBeLessThanOrEqual(12);
    expect(app.screens[0].texts[0].text.length).toBeLessThanOrEqual(60);
    expect(JSON.stringify(app).length).toBeLessThan(12_000);
  });
});

describe('buildMakeRealPrompt', () => {
  it('pairs a one-file system prompt with the structured user payload', () => {
    const app = buildAppDescription(appDoc());
    const { system, user } = buildMakeRealPrompt(app);
    expect(system).toMatch(/ONE complete, self-contained HTML file/);
    expect(user).toContain('Semantic HTML');
    expect(user).toContain('<button>');
    expect(user).toContain('hash router');
    expect(user).toContain('No external assets');
    expect(user).toContain(DREAM_HEADER_COMMENT);
    expect(user).toContain('320x240');
    // The payload is the JSON description itself.
    expect(user).toContain(JSON.stringify(app));
  });
});

describe('extractHtmlFromReply', () => {
  const doc = '<!doctype html>\n<html><body><p>hi</p></body>\n</html>';

  it('takes a fenced html block', () => {
    expect(extractHtmlFromReply(`\`\`\`html\n${doc}\n\`\`\``)).toBe(doc);
  });

  it('strips preamble and epilogue chatter', () => {
    expect(
      extractHtmlFromReply(`Sure! Here you go:\n\`\`\`html\n${doc}\n\`\`\`\nHope it helps!`),
    ).toBe(doc);
  });

  it('prefers the html-tagged fence among several', () => {
    const css = '```css\nbody{color:red}\n```';
    expect(extractHtmlFromReply(`${css}\n\`\`\`html\n${doc}\n\`\`\``)).toBe(doc);
  });

  it('falls back to the longest fence when none is tagged', () => {
    const reply = `\`\`\`\nsmall\n\`\`\`\n\`\`\`\n${doc}\n\`\`\``;
    expect(extractHtmlFromReply(reply)).toBe(doc);
  });

  it('reads raw doctype output with trailing chatter', () => {
    expect(extractHtmlFromReply(`${doc}\nLet me know if you need changes!`)).toBe(doc);
  });

  it('reads raw <html> without a doctype', () => {
    const bare = '<html><body>x</body></html>';
    expect(extractHtmlFromReply(`here:\n${bare}`)).toBe(bare);
  });

  it('keeps a truncated reply (no closing fence or </html>)', () => {
    const partial = '<!doctype html>\n<html><body><p>half';
    expect(extractHtmlFromReply(`\`\`\`html\n${partial}`)).toBe(partial);
    expect(extractHtmlFromReply(partial)).toBe(partial);
  });

  it('returns null when there is no HTML at all', () => {
    expect(extractHtmlFromReply('I cannot help with that.')).toBeNull();
    expect(extractHtmlFromReply('')).toBeNull();
  });
});

describe('validateGeneratedHtml', () => {
  it('accepts a self-contained document', () => {
    expect(validateGeneratedHtml('<!doctype html><html><body></body></html>')).toEqual({
      ok: true,
    });
    // Inline data: URLs carry no scheme and are fine.
    expect(
      validateGeneratedHtml('<html><body><img src="data:image/png;base64,AAAA"></body></html>'),
    ).toEqual({ ok: true });
  });

  it('rejects non-HTML and external references', () => {
    expect(validateGeneratedHtml('<div>not a document</div>')).toEqual({
      ok: false,
      reason: 'no-html',
    });
    expect(
      validateGeneratedHtml(
        '<html><head><script src="https://evil.example/x.js"></script></head></html>',
      ),
    ).toEqual({ ok: false, reason: 'external-url' });
    expect(
      validateGeneratedHtml('<html><body><a href="http://example.com">x</a></body></html>'),
    ).toEqual({ ok: false, reason: 'external-url' });
  });
});

describe('buildTemplateAppHtml', () => {
  it('emits one <section> per screen with real text and wired navigation', () => {
    const html = buildTemplateAppHtml(buildAppDescription(appDoc()));
    expect(html).toContain('<section class="screen" id="screen-1"');
    expect(html).toContain('<section class="screen" id="screen-2"');
    // Text is real text — the biggest becomes the heading.
    expect(html).toContain(
      '<h1 class="text" style="left:24px;top:30px;font-size:32px;color:#1f2937">Welcome!</h1>',
    );
    // The hotspot is a real button targeting the second screen.
    expect(html).toContain('data-go="screen-2"');
    expect(html).toContain('>Go to Screen 2</button>');
    // The router reads the hash.
    expect(html).toContain('window.location.hash');
  });

  it('opens on the frame that was active at export time', () => {
    const html = buildTemplateAppHtml(buildAppDescription(appDoc()));
    expect(html).toContain("var START='screen-2'");
  });

  it('draws imported images from embedded PNG pixels instead of placeholders', () => {
    const doc = appDoc();
    const image = imageOp(10, 20, 8, 6);
    doc.frames![0].layers[0] = createLayer('L', [image]);
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const html = buildTemplateAppHtml(buildAppDescription(doc, { [image.id]: png }));
    expect(html).toContain(`<img class="shape" src="${png}"`);
    expect(html).toContain('width:16px;height:12px');
    expect(html).not.toContain('image lived here');
  });

  it('is honest, self-contained and gift-wrapped', () => {
    const html = buildTemplateAppHtml(buildAppDescription(appDoc()));
    expect(html).toContain(DREAM_HEADER_COMMENT);
    expect(html).toContain('generated locally by Dream AI');
    expect(html).not.toMatch(/https?:\/\//);
    expect(validateGeneratedHtml(html)).toEqual({ ok: true });
  });

  it('escapes the document name and text content', () => {
    const doc = { ...appDoc(), name: 'My <App> & "Friends"' };
    doc.frames![0].layers[0] = createLayer('L', [textOp('Say "hi" <now>', 10, 10)]);
    const html = buildTemplateAppHtml(buildAppDescription(doc));
    expect(html).toContain('<title>My &lt;App&gt; &amp; &quot;Friends&quot;</title>');
    expect(html).toContain('Say &quot;hi&quot; &lt;now&gt;');
    expect(html).not.toContain('Say "hi" <now>');
  });

  it('is deterministic — same description, same file', () => {
    const app = buildAppDescription(appDoc());
    expect(buildTemplateAppHtml(app)).toBe(buildTemplateAppHtml(app));
  });
});
