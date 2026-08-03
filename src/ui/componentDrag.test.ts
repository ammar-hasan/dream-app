import { afterEach, describe, expect, it } from 'vitest';
import type { Component } from '../engine/types';
import {
  activeComponentDrag,
  beginComponentDrag,
  endComponentDrag,
  onComponentDragEnd,
} from './componentDrag';

const component = (id: string): Component => ({
  id,
  name: `Component ${id}`,
  width: 20,
  height: 10,
  operations: [],
  createdAt: 1,
  updatedAt: 1,
});

afterEach(() => endComponentDrag());

describe('component drag session', () => {
  it('carries the exact component until its matching drag ends', () => {
    const card = component('card');
    let ended = 0;
    const unsubscribe = onComponentDragEnd(() => {
      ended += 1;
    });
    beginComponentDrag(card);
    expect(activeComponentDrag()).toBe(card);

    endComponentDrag('another');
    expect(activeComponentDrag()).toBe(card);
    expect(ended).toBe(0);

    endComponentDrag('card');
    expect(activeComponentDrag()).toBeNull();
    expect(ended).toBe(1);
    unsubscribe();
  });
});
