import { describe, expect, it } from 'vitest';
import { createDataPlot, dataPlotBounds, parsePlotData } from './dataPlot';

describe('scientific data plots', () => {
  it('parses quoted CSV and multiple numeric series', () => {
    const result = parsePlotData('Time,"Drug A",Control\n0,1,2\n1,2.5,2\n2,4,3');
    expect(result).toEqual({
      ok: true,
      dataset: {
        xLabel: 'Time',
        x: [0, 1, 2],
        series: [
          { label: 'Drug A', values: [1, 2.5, 4] },
          { label: 'Control', values: [2, 2, 3] },
        ],
      },
    });
  });

  it('accepts tab-separated data and rejects misleading input', () => {
    expect(parsePlotData('Dose\tResponse\n0\t1\n10\t4').ok).toBe(true);
    expect(parsePlotData('')).toEqual({ ok: false, error: 'empty' });
    expect(parsePlotData('X,Y\n0,1')).toEqual({ ok: false, error: 'rows' });
    expect(parsePlotData('X,Y\n0,nope\n1,2')).toEqual({ ok: false, error: 'number' });
    expect(parsePlotData('X,Y\n0,\n1,2')).toEqual({ ok: false, error: 'number' });
    expect(parsePlotData('X,Y\n0,1,2\n1,2')).toEqual({ ok: false, error: 'columns' });
    expect(parsePlotData('X,A,B,C,D,E\n0,1,2,3,4,5\n1,2,3,4,5,6')).toEqual({
      ok: false,
      error: 'columns',
    });
    expect(parsePlotData('X,"Signal\n0,1\n1,2')).toEqual({ ok: false, error: 'columns' });
    const many = `X,Y\n${Array.from({ length: 201 }, (_, index) => `${index},${index}`).join('\n')}`;
    expect(parsePlotData(many)).toEqual({ ok: false, error: 'too-many' });
  });

  it('creates grouped line marks with axes, grid, labels and points', () => {
    const parsed = parsePlotData('Time,Signal\n0,2\n1,4\n2,3');
    if (!parsed.ok) throw new Error('fixture did not parse');
    const operations = createDataPlot(parsed.dataset, {
      kind: 'line',
      bounds: dataPlotBounds(800, 600),
      title: 'Reaction rate',
      color: '#111111',
      fontFamily: 'sans-serif',
    });
    const groups = new Set(operations.map((op) => op.groupId));
    expect(groups.size).toBe(1);
    expect(operations.some((op) => op.kind === 'stroke')).toBe(true);
    expect(
      operations.some(
        (op) => op.kind === 'shape' && op.shape === 'line' && op.lineStyle === 'arrow',
      ),
    ).toBe(true);
    expect(operations.some((op) => op.kind === 'text' && op.text === 'Reaction rate')).toBe(true);
    expect(operations.some((op) => op.kind === 'text' && op.text === 'Signal')).toBe(true);
    expect(operations.some((op) => op.kind === 'text' && op.text === '0')).toBe(true);
  });

  it('creates scatter points without a connecting stroke and grouped bars around zero', () => {
    const parsed = parsePlotData('Dose,Response\n0,-2\n1,4');
    if (!parsed.ok) throw new Error('fixture did not parse');
    const base = {
      bounds: { x: 0, y: 0, width: 500, height: 320 },
      color: '#222222' as const,
      fontFamily: 'sans-serif',
    };
    const scatter = createDataPlot(parsed.dataset, { ...base, kind: 'scatter' });
    expect(scatter.some((op) => op.kind === 'stroke')).toBe(false);
    const bars = createDataPlot(parsed.dataset, { ...base, kind: 'bar' });
    expect(bars.some((op) => op.kind === 'shape' && op.shape === 'rectangle' && op.fill)).toBe(
      true,
    );
  });
});
