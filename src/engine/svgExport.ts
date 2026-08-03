/** Pure SVG export for documents whose visible marks remain genuinely vector. */

import { arrowheadPoints, normalizeRect } from './geometry';
import { isIdentity, normalizeAdjustments } from './filters';
import { sprayDots } from './spray';
import type { DreamDocument, Operation, Point } from './types';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function n(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function attrs(op: Operation): string {
  return ` opacity="${n(op.opacity)}"`;
}

function points(value: readonly Point[]): string {
  return value.map((point) => `${n(point.x)},${n(point.y)}`).join(' ');
}

function arrowPath(tail: Point, tip: Point, size: number): string {
  const [a, b] = arrowheadPoints(tail, tip, size);
  return `M ${n(tip.x)} ${n(tip.y)} L ${n(a.x)} ${n(a.y)} M ${n(tip.x)} ${n(tip.y)} L ${n(b.x)} ${n(b.y)}`;
}

function operationSvg(op: Operation): string {
  const opacity = attrs(op);
  if (op.kind === 'stroke') {
    if (op.tool === 'spray') {
      return sprayDots(op)
        .map(
          (dot) =>
            `<rect x="${n(dot.x - dot.size / 2)}" y="${n(dot.y - dot.size / 2)}" width="${n(dot.size)}" height="${n(dot.size)}" fill="${escapeXml(op.color)}"${opacity}/>`,
        )
        .join('');
    }
    if (op.widths?.length === op.points.length) {
      return op.points
        .slice(1)
        .map((point, index) => {
          const from = op.points[index];
          const width = Math.max(0.5, ((op.widths![index] + op.widths![index + 1]) / 2) * op.size);
          return `<line x1="${n(from.x)}" y1="${n(from.y)}" x2="${n(point.x)}" y2="${n(point.y)}" fill="none" stroke="${escapeXml(op.color)}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"${opacity}/>`;
        })
        .join('');
    }
    return `<polyline points="${points(op.points)}" fill="none" stroke="${escapeXml(op.color)}" stroke-width="${n(op.size)}" stroke-linecap="round" stroke-linejoin="round"${opacity}/>`;
  }
  if (op.kind === 'shape') {
    if (op.shape === 'line') {
      const base = `<line x1="${n(op.from.x)}" y1="${n(op.from.y)}" x2="${n(op.to.x)}" y2="${n(op.to.y)}" stroke="${escapeXml(op.color)}" stroke-width="${n(op.size)}" stroke-linecap="round"${opacity}/>`;
      const ends: string[] = [];
      if (op.lineStyle === 'arrow' || op.lineStyle === 'double-arrow') {
        ends.push(arrowPath(op.from, op.to, op.size));
      }
      if (op.lineStyle === 'double-arrow') ends.push(arrowPath(op.to, op.from, op.size));
      return ends.length === 0
        ? base
        : `${base}<path d="${ends.join(' ')}" fill="none" stroke="${escapeXml(op.color)}" stroke-width="${n(op.size)}" stroke-linecap="round" stroke-linejoin="round"${opacity}/>`;
    }
    const rect = normalizeRect(op.from, op.to);
    const paint = op.fill
      ? `fill="${escapeXml(op.color)}" stroke="none"`
      : `fill="none" stroke="${escapeXml(op.color)}" stroke-width="${n(op.size)}"`;
    if (op.shape === 'rectangle') {
      return `<rect x="${n(rect.x)}" y="${n(rect.y)}" width="${n(rect.width)}" height="${n(rect.height)}" ${paint}${opacity}/>`;
    }
    return `<ellipse cx="${n(rect.x + rect.width / 2)}" cy="${n(rect.y + rect.height / 2)}" rx="${n(rect.width / 2)}" ry="${n(rect.height / 2)}" ${paint}${opacity}/>`;
  }
  if (op.kind === 'text') {
    return `<text x="${n(op.position.x)}" y="${n(op.position.y)}" fill="${escapeXml(op.color)}" font-family="${escapeXml(op.fontFamily)}" font-size="${n(op.fontSize)}" dominant-baseline="text-before-edge"${opacity}>${escapeXml(op.text)}</text>`;
  }
  throw new Error('SVG export received pixel content');
}

/** True only when every visible operation can remain vector in the output. */
export function canExportSvg(doc: DreamDocument): boolean {
  return doc.layers.every(
    (layer) =>
      !layer.visible ||
      (isIdentity(normalizeAdjustments(layer.adjustments)) &&
        layer.operations.every(
          (op) =>
            op.kind !== 'fill' &&
            op.kind !== 'image' &&
            !(op.kind === 'stroke' && op.tool === 'eraser'),
        )),
  );
}

/** Build one standalone SVG for the active canvas/frame. */
export function buildSvg(doc: DreamDocument): string {
  if (!canExportSvg(doc)) throw new Error('SVG export requires vector-safe visible content');
  const layers = doc.layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      const blend =
        layer.blendMode && layer.blendMode !== 'normal'
          ? ` style="mix-blend-mode:${layer.blendMode}"`
          : '';
      return `<g opacity="${n(layer.opacity)}"${blend}>${layer.operations.map(operationSvg).join('')}</g>`;
    })
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(doc.width)}" height="${n(doc.height)}" viewBox="0 0 ${n(doc.width)} ${n(doc.height)}">`,
    `<title>${escapeXml(doc.name)}</title>`,
    `<rect width="100%" height="100%" fill="${escapeXml(doc.background)}"/>`,
    layers,
    '</svg>',
  ].join('');
}
