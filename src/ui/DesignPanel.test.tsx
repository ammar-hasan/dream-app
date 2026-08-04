import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { DesignPanel } from './DesignPanel';

beforeEach(() => {
  useUiPrefs.getState().setLocale('en');
  const store = useDreamStore.getState();
  store.newDocument({ width: 100, height: 80, name: 'Grid test' });
  store.setMode('design');
  store.setGridVisible(false);
  store.setGridSize(16);
  store.setGridSnapping(true);
});

afterEach(cleanup);

describe('Design workspace grid', () => {
  it('reveals exact grid controls without changing the document', () => {
    const before = useDreamStore.getState().doc;
    render(<DesignPanel />);

    const show = screen.getByRole('checkbox', { name: 'Show grid' });
    const size = screen.getByRole('spinbutton', { name: 'Grid size' });
    const snap = screen.getByRole('checkbox', { name: 'Snap to grid' });
    expect(size).toBeDisabled();
    expect(snap).toBeDisabled();

    fireEvent.click(show);
    expect(size).toBeEnabled();
    expect(snap).toBeEnabled();
    fireEvent.change(size, { target: { value: '24' } });

    expect(useDreamStore.getState()).toMatchObject({
      gridVisible: true,
      gridSize: 24,
      gridSnappingEnabled: true,
    });
    expect(useDreamStore.getState().doc).toBe(before);
    expect(useDreamStore.getState().canUndo).toBe(false);
  });
});
