/**
 * Play-mode default cast: when a role has no layer (or the layer is empty),
 * the game draws a friendly stand-in — a smiley hero, a gold star to catch
 * and a grumpy rock to dodge. Pure drawing through the renderer's 2D-context
 * subset, so tests record calls against the same mock as the engine renderer.
 * No AI, no assets — just shapes.
 */

import type { Renderer2D } from '../engine/renderer';

/** Five-point star path centered at (cx, cy). */
function starPath(ctx: Renderer2D, cx: number, cy: number, radius: number): void {
  const inner = radius * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.fill();
}

/** Smiley-circle hero: the catcher when nothing is cast. */
export function drawDefaultHero(ctx: Renderer2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  ctx.save();
  ctx.fillStyle = '#38bdf8'; // sky
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.2, r * 0.11, r * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.35, cy - r * 0.2, r * 0.11, r * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Smile (stroked arc)
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.1, r * 0.45, r * 0.4, 0, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.restore();
}

/** Gold star: the good thing worth +1. */
export function drawDefaultGood(ctx: Renderer2D, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.fillStyle = '#facc15'; // yellow
  starPath(ctx, cx, cy, size / 2);
  ctx.restore();
}

/** Grumpy spiky rock: the bad thing that costs a life. */
export function drawDefaultBad(ctx: Renderer2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  ctx.save();
  // Spiky body
  ctx.fillStyle = '#6b7280'; // gray
  ctx.beginPath();
  const spikes = 8;
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.62;
    const angle = (i * Math.PI) / spikes;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.fill();
  // Grumpy eyes
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.25, cy - r * 0.1, r * 0.1, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.25, cy - r * 0.1, r * 0.1, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Frown
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.45, r * 0.3, r * 0.25, 0, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
}

/** Dreamy pipe: the Flappy Dream gate when no obstacle is cast. Drawn as a
 *  vertical bar sprite — the view stretches it over each gate band. */
export function drawDefaultGate(ctx: Renderer2D, cx: number, cy: number, size: number): void {
  const w = size * 0.5;
  ctx.save();
  ctx.fillStyle = '#34d399'; // soft emerald
  ctx.beginPath();
  ctx.rect(cx - w / 2, cy - size / 2, w, size);
  ctx.fill();
  // Rim bands top and bottom, like a pipe's lip
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.rect(cx - w / 2 - size * 0.05, cy - size / 2, w + size * 0.1, size * 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx - w / 2 - size * 0.05, cy + size / 2 - size * 0.12, w + size * 0.1, size * 0.12);
  ctx.fill();
  ctx.restore();
}

/** Grass-topped earth tile: Dream Jumper's platform stand-in. */
export function drawDefaultPlatform(ctx: Renderer2D, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.rect(cx - size / 2, cy - size / 2, size, size);
  ctx.fill();
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.rect(cx - size / 2, cy - size / 2, size, size * 0.22);
  ctx.fill();
  ctx.restore();
}
