import { describe, expect, it } from 'vitest';
import { createLayerMask, normalizeLayerMask } from './masks';

describe('layer masks', () => {
  it('starts fully revealing and normalizes portable brush gestures', () => {
    expect(createLayerMask()).toEqual({ enabled: true, strokes: [] });
    expect(
      normalizeLayerMask({
        enabled: false,
        strokes: [
          {
            id: 'm1',
            mode: 'reveal',
            points: [
              { x: 1, y: 2 },
              { x: 3, y: 4 },
            ],
            size: 10,
            opacity: 0.5,
            widths: [0.2, 1],
          },
        ],
      }),
    ).toEqual({
      enabled: false,
      strokes: [
        {
          id: 'm1',
          mode: 'reveal',
          points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ],
          size: 10,
          opacity: 0.5,
          widths: [0.2, 1],
        },
      ],
    });
  });

  it('drops invalid strokes and clamps recoverable settings', () => {
    expect(normalizeLayerMask(null)).toBeUndefined();
    expect(
      normalizeLayerMask({
        strokes: [
          { id: 'bad', points: [], size: 2, opacity: 1 },
          { id: 'ok', points: [{ x: 2, y: 3 }], size: -4, opacity: 8 },
        ],
      }),
    ).toEqual({
      enabled: true,
      strokes: [
        {
          id: 'ok',
          mode: 'hide',
          points: [{ x: 2, y: 3 }],
          size: 0.5,
          opacity: 1,
        },
      ],
    });
  });
});
