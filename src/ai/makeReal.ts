/**
 * AI "make real" code export: turn an app-mode document (frames = screens,
 * hotspots = navigation) into a REAL single-file web app — semantic,
 * readable, commented HTML/CSS/JS that a developer (or a kid's parent) can
 * open, learn from and extend. Unlike the deterministic interactive-app
 * export (pixel-faithful frames as images), this path describes the app
 * structurally and gets back actual code.
 *
 * Everything here is pure TypeScript — no DOM, no provider calls:
 *
 * - `buildAppDescription` compresses the document into a small structured
 *   payload (texts, shapes as boxes, the navigation graph — never pixels),
 *   cheap enough for small chat models.
 * - `buildMakeRealPrompt` wraps that description in the system+user prompt
 *   pair sent to a chat-capable BYOK provider.
 * - `extractHtmlFromReply` / `validateGeneratedHtml` pull the one HTML file
 *   out of messy model replies and reject anything that isn't self-contained.
 * - `buildTemplateAppHtml` is the deterministic fallback used by the built-in
 *   Dream AI provider: it turns the same description into a decent semantic
 *   app directly — free, offline, and honestly labeled as generated locally.
 */

import { activeFrameIndex } from '../engine/animation';
import { escapeHtml } from '../engine/appExport';
import { hexToRgba } from '../engine/color';
import { normalizeRect } from '../engine/geometry';
import { hotspotTargetIndex } from '../engine/hotspots';
import { selectionBounds } from '../engine/selection';
import type { DreamDocument, Frame, HotspotTransition, Operation, Rect } from '../engine/types';
import { analyzeDocument } from './analyze';

/** The header comment every generated file starts with — the gift wrap. */
export const DREAM_HEADER_COMMENT = 'Made with Dream — where drawings come alive.';

// Caps keep the prompt payload small enough for cheap models.
const MAX_TEXTS_PER_SCREEN = 12;
const MAX_ELEMENTS_PER_SCREEN = 12;
const MAX_TEXT_LENGTH = 60;

export interface MakeRealText {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

/** A drawn thing summarized as a box + color — pixels stay in Dream. */
export interface MakeRealElement {
  kind: 'rectangle' | 'ellipse' | 'line' | 'drawing' | 'image' | 'fill';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  /** Outline thickness for unfilled shapes/lines. */
  size?: number;
  filled?: boolean;
}

/** One hotspot: tap this box on screen `index` → show screen `target`. */
export interface MakeRealLink {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Screen index (0-based, play order). */
  target: number;
  transition: HotspotTransition;
}

export interface MakeRealScreen {
  index: number;
  name: string;
  background: string;
  /** Dominant colors, most-used first (up to 3). */
  palette: string[];
  texts: MakeRealText[];
  elements: MakeRealElement[];
  links: MakeRealLink[];
}

export interface MakeRealApp {
  name: string;
  width: number;
  height: number;
  /** Screen the app opens on (the frame active at export time). */
  startIndex: number;
  screens: MakeRealScreen[];
}

const round = (n: number) => Math.round(n);

function roundRect(r: Rect): Rect {
  return {
    x: round(r.x),
    y: round(r.y),
    width: Math.max(0, round(r.width)),
    height: Math.max(0, round(r.height)),
  };
}

/** Summarize one non-text op as a kind + box (+ color). Null = skip. */
function describeElement(op: Operation): MakeRealElement | null {
  switch (op.kind) {
    case 'shape':
      return {
        kind: op.shape,
        ...roundRect(normalizeRect(op.from, op.to)),
        color: op.color,
        size: Math.max(1, round(op.size)),
        filled: op.fill === true,
      };
    case 'stroke':
      return { kind: 'drawing', ...roundRect(selectionBounds(op)), color: op.color };
    case 'image':
      return {
        kind: 'image',
        x: round(op.patch.x),
        y: round(op.patch.y),
        width: Math.max(0, round(op.patch.width * op.scale)),
        height: Math.max(0, round(op.patch.height * op.scale)),
      };
    case 'fill':
      return { kind: 'fill', ...roundRect(op.patch), color: op.color };
    default:
      return null;
  }
}

function describeScreen(doc: DreamDocument, frame: Frame, index: number): MakeRealScreen {
  // Reuse the feedback palette work — it reads the document, never pixels out.
  const analysis = analyzeDocument({ ...doc, layers: frame.layers });
  const texts: MakeRealText[] = [];
  const elements: MakeRealElement[] = [];
  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    for (const op of layer.operations) {
      if (op.kind === 'text') {
        if (texts.length < MAX_TEXTS_PER_SCREEN) {
          texts.push({
            text: op.text.slice(0, MAX_TEXT_LENGTH),
            x: round(op.position.x),
            y: round(op.position.y),
            fontSize: Math.max(1, round(op.fontSize)),
            color: op.color,
          });
        }
        continue;
      }
      if (elements.length >= MAX_ELEMENTS_PER_SCREEN) continue;
      const element = describeElement(op);
      if (element) elements.push(element);
    }
  }
  const links: MakeRealLink[] = (frame.hotspots ?? [])
    .map((hotspot) => ({ hotspot, target: hotspotTargetIndex(doc, hotspot) }))
    .filter(({ target }) => target !== -1) // broken links (target deleted) are dropped
    .map(({ hotspot, target }) => ({
      ...roundRect(hotspot.rect),
      target,
      transition: hotspot.transition,
    }));
  return {
    index,
    name: `Screen ${index + 1}`,
    background: doc.background,
    palette: analysis.palette.slice(0, 3).map((p) => p.color),
    texts,
    elements,
    links,
  };
}

/**
 * The document as a compact structured description: screens with their
 * texts, shape boxes and dominant colors, plus the navigation graph. A
 * document without frames is a single-screen app.
 */
export function buildAppDescription(doc: DreamDocument): MakeRealApp {
  const frames = doc.frames ?? [{ id: 'single', layers: doc.layers }];
  return {
    name: doc.name.trim() || 'Dream app',
    width: doc.width,
    height: doc.height,
    startIndex: doc.frames ? Math.max(0, activeFrameIndex(doc)) : 0,
    screens: frames.map((frame, index) => describeScreen(doc, frame, index)),
  };
}

// --- The prompt ------------------------------------------------------------

const MAKE_REAL_SYSTEM =
  'You are an expert front-end developer helping a beginner turn a drawn app ' +
  'sketch into real, readable code. Reply with exactly ONE complete, ' +
  'self-contained HTML file and nothing else — no explanation, no follow-up ' +
  'questions.';

/** The system+user prompt pair for chat-capable providers. */
export function buildMakeRealPrompt(app: MakeRealApp): { system: string; user: string } {
  const user = [
    'Turn this app description into ONE self-contained HTML file (HTML + CSS + JS in a single file).',
    'Requirements:',
    '- Semantic HTML: every screen is a <section>, texts are real text, tappable areas are real <button> elements.',
    '- Accessible: a real <title>, labelled buttons, good contrast, keyboard-friendly.',
    '- Responsive: the app scales to fit any window.',
    `- Keep the drawn proportions — the canvas is ${app.width}x${app.height} pixels.`,
    '- Navigation: wire the links as a tiny hash router (or show/hide) so a button shows its target screen.',
    '- No external assets or URLs of any kind — everything inline.',
    '- Beginner-friendly: short comments explaining each part.',
    `- Start the file with an HTML comment saying: ${DREAM_HEADER_COMMENT}`,
    'App description (JSON):',
    JSON.stringify(app),
  ].join('\n');
  return { system: MAKE_REAL_SYSTEM, user };
}

// --- Reading the model's reply ----------------------------------------------

/**
 * Pull the one HTML file out of a chat reply. Handles preamble chatter,
 * markdown fences (prefers a fence tagged ```html, else the longest), raw
 * doctype output and truncated replies. Null when there's no HTML at all.
 */
export function extractHtmlFromReply(reply: string): string | null {
  const fences = [...reply.matchAll(/```(\w*)[^\S\n]*\n([\s\S]*?)(?:```|$)/g)];
  if (fences.length > 0) {
    const tagged = fences.find((f) => f[1].toLowerCase() === 'html');
    const best = tagged ?? fences.reduce((a, b) => (b[2].length > a[2].length ? b : a));
    const code = best[2].trim();
    if (code) return code;
  }
  const lower = reply.toLowerCase();
  let start = lower.indexOf('<!doctype');
  if (start === -1) start = lower.indexOf('<html');
  if (start === -1) return null;
  const close = lower.lastIndexOf('</html>');
  const end = close >= start ? close + '</html>'.length : reply.length;
  return reply.slice(start, end).trim();
}

export type HtmlValidation = { ok: true } | { ok: false; reason: 'no-html' | 'external-url' };

/**
 * Minimal safety net for model output: it must be an HTML document and it
 * must be self-contained — no external http(s) references (inline data:
 * URLs are fine, they carry no scheme).
 */
export function validateGeneratedHtml(html: string): HtmlValidation {
  if (!/<html[\s>]/i.test(html)) return { ok: false, reason: 'no-html' };
  if (/https?:\/\//i.test(html)) return { ok: false, reason: 'external-url' };
  return { ok: true };
}

// --- The deterministic Dream AI template ------------------------------------

/** A hex color at a given alpha, for soft approximation panels. */
function soft(color: string, alpha: number): string {
  const rgba = hexToRgba(color);
  if (!rgba) return `rgba(128,128,128,${alpha})`;
  return `rgba(${rgba.r},${rgba.g},${rgba.b},${alpha})`;
}

function elementHtml(el: MakeRealElement): string {
  const box = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px`;
  switch (el.kind) {
    case 'rectangle':
      return (
        `  <!-- a drawn rectangle -->\n` +
        `  <div class="shape" style="${box};${el.filled ? `background:${el.color}` : `border:${el.size}px solid ${el.color}`};border-radius:6px"></div>`
      );
    case 'ellipse':
      return (
        `  <!-- a drawn ellipse -->\n` +
        `  <div class="shape" style="${box};${el.filled ? `background:${el.color}` : `border:${el.size}px solid ${el.color}`};border-radius:50%"></div>`
      );
    case 'line':
      return (
        `  <!-- a drawn line (diagonals are approximated) -->\n` +
        `  <div class="shape" style="left:${el.x}px;top:${el.y + Math.round(el.height / 2)}px;width:${el.width}px;height:0;border-top:${el.size}px solid ${el.color}"></div>`
      );
    case 'drawing':
      return (
        `  <!-- a freehand drawing, approximated as a soft panel -->\n` +
        `  <div class="shape" style="${box};background:${soft(el.color ?? '#888888', 0.15)};border:2px dashed ${el.color};border-radius:12px"></div>`
      );
    case 'fill':
      return (
        `  <!-- a filled region -->\n` +
        `  <div class="shape" style="${box};background:${el.color}"></div>`
      );
    case 'image':
      return (
        `  <!-- an imported image lived here (its pixels stay in Dream) -->\n` +
        `  <div class="shape" style="${box};background:rgba(150,160,180,.25);border:2px dashed rgba(150,160,180,.8);border-radius:8px"></div>`
      );
  }
}

function screenHtml(app: MakeRealApp, screen: MakeRealScreen): string {
  // The biggest text on the screen becomes its heading; the rest are paragraphs.
  const maxFont = Math.max(0, ...screen.texts.map((text) => text.fontSize));
  const texts = screen.texts
    .map((text) => {
      const tag = text.fontSize === maxFont ? 'h1' : 'p';
      return (
        `  <!-- text: "${escapeHtml(text.text)}" -->\n` +
        `  <${tag} class="text" style="left:${text.x}px;top:${text.y}px;font-size:${text.fontSize}px;color:${text.color}">${escapeHtml(text.text)}</${tag}>`
      );
    })
    .join('\n');
  const shapes = screen.elements.map(elementHtml).join('\n');
  const buttons = screen.links
    .map(
      (link) =>
        `  <!-- link: tapping goes to ${app.screens[link.target]?.name ?? `Screen ${link.target + 1}`} -->\n` +
        `  <button class="hotspot" type="button" data-go="screen-${link.target + 1}" ` +
        `style="left:${link.x}px;top:${link.y}px;width:${link.width}px;height:${link.height}px">` +
        `Go to Screen ${link.target + 1}</button>`,
    )
    .join('\n');
  return (
    `<!-- ======== ${screen.name} ======== -->\n` +
    `<section class="screen" id="screen-${screen.index + 1}" aria-label="${screen.name}" style="background:${screen.background}">\n` +
    [texts, shapes, buttons].filter((part) => part !== '').join('\n') +
    `\n</section>`
  );
}

/**
 * The built-in Dream AI code generator: a deterministic template that turns
 * the app description into a real, commented single-file app — screens as
 * <section>s, text as real text, shapes as styled divs, hotspot navigation
 * wired to a tiny hash router. Honestly labeled as generated locally.
 */
export function buildTemplateAppHtml(app: MakeRealApp): string {
  const title = escapeHtml(app.name);
  const sections = app.screens.map((screen) => screenHtml(app, screen)).join('\n');
  const start = `screen-${app.startIndex + 1}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<!--
  ${title}
  ${DREAM_HEADER_COMMENT}
  Generated locally by Dream AI from your drawing — connect your own AI in
  Dream for richer code.
  How it works: each drawn frame is a <section class="screen"> below, and the
  small script at the bottom shows one screen at a time using the #hash in
  the address bar. Read it, tweak it, make it yours!
-->
<style>
/* --- the page: a dark surround so your app pops ------------------------ */
html,body{margin:0;height:100%;background:#10131a;font-family:system-ui,-apple-system,sans-serif}
/* --- the stage: your canvas size, scaled to fit any window -------------- */
#fit{position:absolute;left:50%;top:50%;width:${app.width}px;height:${app.height}px;transform-origin:center;border-radius:8px;overflow:hidden;box-shadow:0 16px 60px rgba(0,0,0,.55)}
/* --- screens: one <section> each; only the ".on" one is visible --------- */
.screen{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .2s ease}
.screen.on{opacity:1;visibility:visible}
/* --- your content: real text and styled boxes ---------------------------- */
.text{position:absolute;margin:0;line-height:1.2;white-space:pre-wrap;max-width:90%}
.shape{position:absolute;box-sizing:border-box}
/* --- hotspot buttons: the links you drew, as real buttons ---------------- */
.hotspot{position:absolute;margin:0;padding:4px;border:0;border-radius:8px;background:rgba(109,124,255,.85);color:#fff;font:inherit;font-size:14px;cursor:pointer;overflow:hidden}
.hotspot:hover,.hotspot:focus-visible{background:#6d7cff;outline:2px solid #fff;outline-offset:-2px}
/* --- the footer --------------------------------------------------------- */
#brand{position:fixed;right:12px;bottom:10px;display:flex;gap:10px;align-items:center;color:rgba(255,255,255,.55);font-size:12px}
#restart{border:1px solid rgba(255,255,255,.25);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;font:inherit;cursor:pointer}
@media (prefers-reduced-motion:reduce){.screen{transition:none}}
</style>
</head>
<body>
<main id="stage" aria-label="${title}">
<div id="fit">
${sections}
</div>
</main>
<footer id="brand"><span>Made with Dream — generated locally by Dream AI</span><button id="restart" type="button">Restart</button></footer>
<script>
// --- The tiny router -----------------------------------------------------
// The hash in the address bar (#screen-2) decides which screen is visible,
// so the browser Back button works too.
var START='${start}';
function show(id){
  var screens=document.querySelectorAll('.screen');
  for(var i=0;i<screens.length;i++)screens[i].classList.toggle('on',screens[i].id===id);
}
function current(){
  var id=window.location.hash.slice(1);
  return document.getElementById(id)&&id.indexOf('screen-')===0?id:START;
}
function navigate(id){window.location.hash=id;}
// Hotspot buttons carry data-go="screen-N" — one listener wires them all.
var buttons=document.querySelectorAll('[data-go]');
for(var i=0;i<buttons.length;i++){
  buttons[i].addEventListener('click',function(){navigate(this.getAttribute('data-go'));});
}
document.getElementById('restart').addEventListener('click',function(){navigate(START);});
window.addEventListener('hashchange',function(){show(current());});
// --- Fit the drawing to the window (it was drawn at ${app.width}x${app.height}) ---
var fit=document.getElementById('fit');
function resize(){
  var s=Math.min(window.innerWidth/${app.width},window.innerHeight/${app.height});
  fit.style.transform='translate(-50%,-50%) scale('+s+')';
}
window.addEventListener('resize',resize);
resize();
show(current());
</script>
</body>
</html>
`;
}
