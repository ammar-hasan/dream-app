import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { useDreamStore } from './store/dreamStore';
import { useUiPrefs } from './store/uiPrefs';

afterEach(cleanup);

describe('App', () => {
  it('renders the shell: toolbar, tool rail, panels and status bar', () => {
    render(<App />);
    expect(screen.getByText('Dream')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Brush' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eraser' })).toBeInTheDocument();
    expect(screen.getByText('Layers')).toBeInTheDocument();
    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('1024 × 768')).toBeInTheDocument();
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
  });

  it('shows the stamp picker when the stamp tool is active', () => {
    render(<App />);
    act(() => useDreamStore.getState().setTool('stamp'));
    expect(screen.getByRole('heading', { name: 'Start with a picture' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rocket' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Under the sea' })).toBeInTheDocument();
    act(() => useDreamStore.getState().setTool('brush'));
  });

  it('applies complete brush presets and marks the active choice', () => {
    render(<App />);
    const marker = screen.getByRole('button', { name: 'Soft marker' });
    fireEvent.click(marker);
    expect(useDreamStore.getState().settings).toMatchObject({
      size: 18,
      opacity: 0.55,
      brushStyle: 'round',
    });
    expect(marker).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Calligraphy' }));
    expect(useDreamStore.getState().settings).toMatchObject({
      size: 16,
      opacity: 1,
      brushStyle: 'calligraphy',
    });
    act(() => {
      useDreamStore.getState().setSize(8);
      useDreamStore.getState().setOpacity(1);
      useDreamStore.getState().setBrushStyle('round');
    });
  });

  it('reflects comfort mode on the root element as a data attribute', () => {
    useUiPrefs.getState().setComfortMode(false);
    const { rerender, unmount } = render(<App />);
    expect(document.documentElement.hasAttribute('data-comfort')).toBe(false);

    useUiPrefs.getState().setComfortMode(true);
    rerender(<App />);
    expect(document.documentElement.hasAttribute('data-comfort')).toBe(true);

    // Dark theme composes: both attributes live side by side.
    useUiPrefs.getState().setTheme('dark');
    rerender(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.hasAttribute('data-comfort')).toBe(true);

    unmount();
    useUiPrefs.getState().setComfortMode(false);
    useUiPrefs.getState().setTheme('light');
  });
});
