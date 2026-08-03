/** Parse small tabular datasets and turn them into native, grouped plot marks. */

import { genId } from './document';
import type { Color, Operation, Point, Rect, ShapeOp, StrokeOp, TextOp } from './types';

export type PlotKind = 'line' | 'scatter' | 'bar';
export type PlotDataError = 'empty' | 'columns' | 'rows' | 'number' | 'too-many';

export interface PlotSeries {
  label: string;
  values: number[];
}

export interface PlotDataset {
  xLabel: string;
  x: number[];
  series: PlotSeries[];
}

export type PlotParseResult =
  { ok: true; dataset: PlotDataset } | { ok: false; error: PlotDataError };

function delimiterOf(line: string): ',' | '\t' | null {
  if (line.includes('\t')) return '\t';
  if (line.includes(',')) return ',';
  return null;
}

function splitCsvRow(line: string, delimiter: ',' | '\t'): string[] | null {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  if (quoted) return null;
  cells.push(cell.trim());
  return cells;
}

/** Parse a header plus 2–200 numeric rows and 1–4 measured series. */
export function parsePlotData(source: string): PlotParseResult {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, error: 'empty' };
  if (lines.length < 3) return { ok: false, error: 'rows' };
  if (lines.length > 201) return { ok: false, error: 'too-many' };

  const delimiter = delimiterOf(lines[0]);
  if (!delimiter) return { ok: false, error: 'columns' };
  const header = splitCsvRow(lines[0], delimiter);
  if (!header || header.length < 2 || header.length > 5 || header.some((cell) => !cell)) {
    return { ok: false, error: 'columns' };
  }

  const columns = header.map(() => [] as number[]);
  for (const line of lines.slice(1)) {
    const row = splitCsvRow(line, delimiter);
    if (!row || row.length !== header.length) return { ok: false, error: 'columns' };
    if (row.some((cell) => cell === '')) return { ok: false, error: 'number' };
    const values = row.map(Number);
    if (values.some((value) => !Number.isFinite(value))) {
      return { ok: false, error: 'number' };
    }
    values.forEach((value, index) => columns[index].push(value));
  }

  return {
    ok: true,
    dataset: {
      xLabel: header[0],
      x: columns[0],
      series: header.slice(1).map((label, index) => ({ label, values: columns[index + 1] })),
    },
  };
}

export interface DataPlotOptions {
  kind: PlotKind;
  bounds: Rect;
  title?: string;
  color: Color;
  fontFamily: string;
}

const SERIES_COLORS: Color[] = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'];

function tickText(value: number): string {
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute >= 10000 || absolute < 0.01)) return value.toExponential(1);
  return String(Math.round(value * 100) / 100);
}

interface AxisScale {
  min: number;
  max: number;
  ticks: number[];
}

function axisScale(values: readonly number[], includeZero: boolean): AxisScale {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = niceFraction * power;
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = min; value <= max + step / 2; value += step) ticks.push(value);
  return { min, max, ticks };
}

/** A centered plot area that leaves breathing room on any document size. */
export function dataPlotBounds(width: number, height: number): Rect {
  return { x: width * 0.08, y: height * 0.11, width: width * 0.84, height: height * 0.74 };
}

/** Create one plot as ordinary grouped shapes, strokes and text. */
export function createDataPlot(dataset: PlotDataset, options: DataPlotOptions): Operation[] {
  const { bounds, kind, fontFamily } = options;
  const groupId = genId('plot');
  const operations: Operation[] = [];
  const fontSize = Math.max(9, Math.min(18, bounds.height * 0.052));
  const left = bounds.x + Math.max(44, bounds.width * 0.12);
  const right = bounds.x + bounds.width - Math.max(14, bounds.width * 0.04);
  const top = bounds.y + (options.title?.trim() ? fontSize * 2.4 : fontSize * 1.5);
  const bottom = bounds.y + bounds.height - fontSize * 2.7;
  const plotWidth = Math.max(1, right - left);
  const plotHeight = Math.max(1, bottom - top);
  const allY = dataset.series.flatMap((series) => series.values);
  const xScale = axisScale(dataset.x, false);
  const yScale = axisScale(allY, kind === 'bar');
  const xAt = (value: number) =>
    left + ((value - xScale.min) / (xScale.max - xScale.min)) * plotWidth;
  const yAt = (value: number) =>
    bottom - ((value - yScale.min) / (yScale.max - yScale.min)) * plotHeight;
  const colorFor = (index: number): Color =>
    index === 0 ? options.color : SERIES_COLORS[(index - 1) % SERIES_COLORS.length];

  const shape = (overrides: Omit<ShapeOp, 'kind' | 'id' | 'groupId'>): ShapeOp => ({
    kind: 'shape',
    id: genId('op'),
    groupId,
    ...overrides,
  });
  const text = (
    value: string,
    position: Point,
    size = fontSize,
    color = options.color,
  ): TextOp => ({
    kind: 'text',
    id: genId('op'),
    groupId,
    position,
    text: value,
    fontSize: size,
    fontFamily,
    color,
    opacity: 1,
  });

  if (options.title?.trim()) {
    operations.push(text(options.title.trim(), { x: bounds.x, y: bounds.y }, fontSize * 1.25));
  }

  yScale.ticks.forEach((value, index) => {
    const y = yAt(value);
    operations.push(
      shape({
        shape: 'line',
        from: { x: left, y },
        to: { x: right, y },
        size: 1,
        color: options.color,
        opacity: index === 0 ? 0.42 : 0.16,
      }),
      text(tickText(value), { x: bounds.x, y: y - fontSize * 0.55 }, fontSize * 0.78),
    );
  });
  const xTicks =
    kind === 'bar'
      ? dataset.x
          .map((value, index) => ({ value, index }))
          .filter(({ index }) => index % Math.max(1, Math.ceil(dataset.x.length / 6)) === 0)
          .map(({ value, index }) => ({
            value,
            x: left + (plotWidth / dataset.x.length) * (index + 0.5),
          }))
      : xScale.ticks.map((value) => ({ value, x: xAt(value) }));
  xTicks.forEach(({ value, x }, index) => {
    operations.push(
      shape({
        shape: 'line',
        from: { x, y: top },
        to: { x, y: bottom },
        size: 1,
        color: options.color,
        opacity: index === 0 ? 0.42 : 0.16,
      }),
      text(tickText(value), { x: x - fontSize, y: bottom + fontSize * 0.35 }, fontSize * 0.78),
    );
  });

  operations.push(
    shape({
      shape: 'line',
      from: { x: left, y: bottom },
      to: { x: right, y: bottom },
      lineStyle: 'arrow',
      size: 2,
      color: options.color,
      opacity: 1,
    }),
    shape({
      shape: 'line',
      from: { x: left, y: bottom },
      to: { x: left, y: top },
      lineStyle: 'arrow',
      size: 2,
      color: options.color,
      opacity: 1,
    }),
    text(dataset.xLabel, { x: left + plotWidth / 2 - fontSize, y: bottom + fontSize * 1.4 }),
  );

  const legendWidth = plotWidth / dataset.series.length;
  dataset.series.forEach((series, index) => {
    const x = left + legendWidth * index;
    const y = top - fontSize * 0.82;
    const color = colorFor(index);
    operations.push(
      shape({
        shape: 'line',
        from: { x, y },
        to: { x: x + fontSize * 1.1, y },
        size: 3,
        color,
        opacity: 1,
      }),
      text(
        series.label,
        { x: x + fontSize * 1.35, y: y - fontSize * 0.55 },
        fontSize * 0.82,
        color,
      ),
    );
  });

  dataset.series.forEach((series, seriesIndex) => {
    const color = colorFor(seriesIndex);
    const plotted = dataset.x.map((x, index) => ({ x: xAt(x), y: yAt(series.values[index]) }));
    if (kind === 'line') {
      const stroke: StrokeOp = {
        kind: 'stroke',
        id: genId('op'),
        groupId,
        tool: 'pencil',
        points: plotted,
        size: 2.5,
        color,
        opacity: 1,
      };
      operations.push(stroke);
    }
    if (kind === 'bar') {
      const groupWidth = plotWidth / Math.max(1, dataset.x.length);
      const barWidth = (groupWidth * 0.68) / dataset.series.length;
      const zero = yAt(0);
      plotted.forEach((point, index) => {
        const center = left + groupWidth * (index + 0.5);
        const x = center - (barWidth * dataset.series.length) / 2 + seriesIndex * barWidth;
        operations.push(
          shape({
            shape: 'rectangle',
            from: { x: x + 1, y: zero },
            to: { x: x + barWidth - 1, y: point.y },
            size: 1,
            color,
            opacity: 0.88,
            fill: true,
          }),
        );
      });
    } else {
      plotted.forEach((point) => {
        const radius = Math.max(2.5, fontSize * 0.22);
        operations.push(
          shape({
            shape: 'ellipse',
            from: { x: point.x - radius, y: point.y - radius },
            to: { x: point.x + radius, y: point.y + radius },
            size: 1,
            color,
            opacity: 1,
            fill: true,
          }),
        );
      });
    }
  });

  return operations;
}
