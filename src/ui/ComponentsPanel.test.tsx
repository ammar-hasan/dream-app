import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { ComponentsPanel } from './ComponentsPanel';

const storage = vi.hoisted(() => ({
  deleteComponent: vi.fn(),
  listComponents: vi.fn(),
  renameComponent: vi.fn(),
  saveComponent: vi.fn(),
}));

vi.mock('../storage/components', () => storage);

const component: Component = {
  id: 'card',
  name: 'Story card',
  width: 20,
  height: 10,
  operations: [
    {
      kind: 'shape',
      id: 'shape',
      shape: 'rectangle',
      color: '#3366ff',
      opacity: 1,
      size: 2,
      from: { x: 0, y: 0 },
      to: { x: 20, y: 10 },
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  storage.listComponents.mockResolvedValue([component]);
  useUiPrefs.getState().setLocale('en');
  useDreamStore.getState().newDocument({ width: 100, height: 80, name: 'Keyboard insert' });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('component library insertion', () => {
  it('exposes a named native button that inserts and selects the component', async () => {
    render(<ComponentsPanel />);
    const insert = await screen.findByRole('button', {
      name: 'Insert Story card at canvas center',
    });

    fireEvent.click(insert);

    const state = useDreamStore.getState();
    expect(state.doc.layers).toHaveLength(2);
    expect(state.doc.layers[1].name).toBe('Story card');
    expect(state.selection).toHaveLength(1);
    expect(state.canUndo).toBe(true);
  });
});
