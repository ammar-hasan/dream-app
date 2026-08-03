import { describe, expect, it } from 'vitest';
import type { PixelBuffer } from '../engine/filters';
import { buildEditMask, ERASE_PROMPT, mergeEditResult } from './inpaint';

const image = (width: number, height: number): PixelBuffer => ({
  data: new Uint8ClampedArray(width * height * 4),
  width,
  height,
});

function alphaAt(mask: PixelBuffer, x: number, y: number): number {
  return mask.data[(y * mask.width + x) * 4 + 3];
}

describe('buildEditMask', () => {
  it('makes only the requested region transparent', () => {
    const mask = buildEditMask(image(4, 3), { x: 1, y: 1, width: 2, height: 1 });
    expect(mask).toMatchObject({ width: 4, height: 3 });
    expect(alphaAt(mask, 0, 0)).toBe(255);
    expect(alphaAt(mask, 1, 1)).toBe(0);
    expect(alphaAt(mask, 2, 1)).toBe(0);
    expect(alphaAt(mask, 3, 1)).toBe(255);
    expect(alphaAt(mask, 1, 2)).toBe(255);
  });

  it('makes the whole mask transparent when no region is supplied', () => {
    const mask = buildEditMask(image(2, 2));
    expect([0, 1, 2, 3].map((i) => mask.data[i * 4 + 3])).toEqual([0, 0, 0, 0]);
  });

  it('rounds outward and clamps a region to the image bounds', () => {
    const mask = buildEditMask(image(3, 2), { x: -1.2, y: 0.4, width: 3, height: 4 });
    expect(alphaAt(mask, 0, 0)).toBe(0);
    expect(alphaAt(mask, 1, 1)).toBe(0);
    expect(alphaAt(mask, 2, 0)).toBe(255);
  });
});

describe('mergeEditResult', () => {
  it('keeps source pixels outside the selected region', () => {
    const source = image(3, 1);
    source.data.set([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255]);
    const edited = image(3, 1);
    edited.data.set([9, 9, 9, 255, 8, 8, 8, 255, 7, 7, 7, 255]);

    const result = mergeEditResult(source, edited, { x: 1, y: 0, width: 1, height: 1 });

    expect([...result.data]).toEqual([1, 1, 1, 255, 8, 8, 8, 255, 3, 3, 3, 255]);
    expect([...source.data]).toEqual([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255]);
  });

  it('accepts the whole edit when no region is supplied', () => {
    const edited = image(1, 1);
    expect(mergeEditResult(image(1, 1), edited)).toBe(edited);
  });
});

it('pins the one-tap erase instruction', () => {
  expect(ERASE_PROMPT).toBe(
    'Remove the object in the masked area and fill the space naturally with the surrounding background.',
  );
});
