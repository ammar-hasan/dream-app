/**
 * App mode: standalone HTML export — the showstopper. Takes the document's
 * frames as PNG data URLs plus the hotspot data and produces ONE
 * self-contained .html file: each frame is an image, each hotspot an
 * invisible button over it, and ~50 lines of vanilla JS handle tap →
 * fade/slide → show the target screen. No dependencies, no external URLs —
 * the file works double-clicked from an email attachment, offline.
 *
 * Pure string generation: fully unit-testable in Node.
 */

import { hotspotTargetIndex } from './hotspots';
import type { DreamDocument, HotspotTransition } from './types';

/** A hotspot as a fraction of the frame size, targeting a frame index. */
export interface AppExportHotspot {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Index into `frames` (play order). */
  target: number;
  transition: HotspotTransition;
}

export interface AppExportFrame {
  /** PNG data URL of the flattened frame. */
  image: string;
  hotspots: AppExportHotspot[];
}

export interface AppExportData {
  title: string;
  width: number;
  height: number;
  /** Frame index the app opens on. */
  startIndex: number;
  frames: AppExportFrame[];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Collect the export model from a document: every frame paired with its
 * rendered image, hotspots converted to fractions of the frame size.
 * Broken hotspots (target frame deleted) are dropped; rects are clamped to
 * the frame so an off-canvas drag can't break the layout.
 */
export function buildAppExportData(
  doc: DreamDocument,
  frameImages: string[],
  startIndex = 0,
): AppExportData {
  const frames = doc.frames ?? [];
  return {
    title: doc.name.trim() || 'Dream app',
    width: doc.width,
    height: doc.height,
    startIndex: Math.max(0, Math.min(startIndex, frames.length - 1)),
    frames: frames.map((frame, i) => ({
      image: frameImages[i] ?? '',
      hotspots: (frame.hotspots ?? [])
        .map((h) => ({ hotspot: h, target: hotspotTargetIndex(doc, h) }))
        .filter(({ target }) => target !== -1)
        .map(({ hotspot, target }) => ({
          x: clamp01(hotspot.rect.x / doc.width),
          y: clamp01(hotspot.rect.y / doc.height),
          width: clamp01(hotspot.rect.width / doc.width),
          height: clamp01(hotspot.rect.height / doc.height),
          target,
          transition: hotspot.transition,
        })),
    })),
  };
}

/** Escape text for HTML element/attribute content. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const pct = (fraction: number) => `${(fraction * 100).toFixed(3)}%`;

/**
 * Render the export model as one self-contained HTML document. Screens are
 * stacked divs (image + hotspot buttons), scaled to fit the window with CSS
 * transform; transitions are opacity/transform-only; hotspots are real
 * <button>s, so the app is keyboard-accessible and touch-friendly.
 */
export function buildAppHtml(data: AppExportData): string {
  const title = escapeHtml(data.title);
  const screens = data.frames
    .map((frame, i) => {
      const buttons = frame.hotspots
        .map(
          (h) =>
            `<button class="hot" type="button" style="left:${pct(h.x)};top:${pct(h.y)};` +
            `width:${pct(h.width)};height:${pct(h.height)}" data-target="${h.target}" ` +
            `data-fx="${h.transition}" aria-label="Go to screen ${h.target + 1}"></button>`,
        )
        .join('');
      return `<div class="screen" role="group" aria-label="Screen ${i + 1}"><img src="${frame.image}" alt="Screen ${i + 1}">${buttons}</div>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
html,body{margin:0;height:100%;background:#10131a;overflow:hidden;font-family:system-ui,-apple-system,sans-serif}
#stage{position:fixed;inset:0}
#fit{position:absolute;left:50%;top:50%;width:${data.width}px;height:${data.height}px;transform-origin:center;border-radius:8px;overflow:hidden;box-shadow:0 16px 60px rgba(0,0,0,.55);background:#fff}
.screen{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease}
.screen.on{opacity:1;pointer-events:auto}
.screen img{position:absolute;inset:0;width:100%;height:100%;display:block}
.hot{position:absolute;border:0;margin:0;padding:0;background:transparent;cursor:pointer;border-radius:6px}
.hot:hover,.hot:focus-visible{background:rgba(109,124,255,.18);outline:2px dashed rgba(109,124,255,.75);outline-offset:-2px}
#brand{position:fixed;right:12px;bottom:10px;display:flex;gap:10px;align-items:center;color:rgba(255,255,255,.55);font-size:12px;letter-spacing:.02em}
#restart{border:1px solid rgba(255,255,255,.25);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;font:inherit;cursor:pointer}
#restart:hover,#restart:focus-visible{background:rgba(255,255,255,.12);outline:none}
@media (prefers-reduced-motion:reduce){.screen{transition:none}}
</style>
</head>
<body>
<main id="stage" aria-label="${title}">
<div id="fit">
${screens}
</div>
</main>
<div id="brand"><span>Made with Dream</span><button id="restart" type="button">Restart</button></div>
<script>
(function(){
var fit=document.getElementById('fit');
var screens=[].slice.call(document.querySelectorAll('.screen'));
var W=${data.width},H=${data.height},START=${data.startIndex},cur=-1,busy=false;
function resize(){var s=Math.min(window.innerWidth/W,window.innerHeight/H);fit.style.transform='translate(-50%,-50%) scale('+s+')';}
window.addEventListener('resize',resize);resize();
function go(i,fx){
if(busy||i===cur||i<0||i>=screens.length)return;
var from=screens[cur],to=screens[i];
if(fx==='slide'&&from){
busy=true;
to.style.transition='none';to.style.transform='translateX(100%)';to.classList.add('on');
void to.offsetWidth;
to.style.transition='';to.style.transform='';
from.style.transform='translateX(-100%)';from.style.opacity='0';
setTimeout(function(){from.classList.remove('on');from.style.transform='';from.style.opacity='';cur=i;busy=false;},270);
}else if(fx==='fade'&&from){
busy=true;
to.classList.add('on');
setTimeout(function(){from.classList.remove('on');cur=i;busy=false;},270);
}else{
if(from)from.classList.remove('on');
to.classList.add('on');cur=i;
}
}
[].forEach.call(document.querySelectorAll('.hot'),function(b){
b.addEventListener('click',function(){go(parseInt(b.getAttribute('data-target'),10),b.getAttribute('data-fx'));});
});
document.getElementById('restart').addEventListener('click',function(){go(START,'fade');});
window.addEventListener('keydown',function(e){if(e.key==='Home')go(START,'fade');});
go(START,'none');
})();
</script>
</body>
</html>
`;
}
