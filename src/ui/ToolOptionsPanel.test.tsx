import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { ToolOptionsPanel } from './ToolOptionsPanel';

beforeEach(() => {
  useUiPrefs.getState().setLocale('en');
  useDreamStore.getState().newDocument({ width: 100, height: 80, name: 'Palette test' });
  useDreamStore.getState().setTool('brush');
  useDreamStore.getState().setColor('#123456');
});

afterEach(cleanup);

describe('project colors', () => {
  it('saves, selects, renames, and deletes a portable named color', () => {
    render(<ToolOptionsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Save current' }));

    expect(useDreamStore.getState().doc.projectColors?.[0]).toMatchObject({
      name: 'Color 1',
      value: '#123456',
    });
    expect(screen.getByText('Text 12.72:1 · AA')).toBeInTheDocument();
    const name = screen.getByRole('textbox', { name: 'Rename Color 1' });
    fireEvent.change(name, { target: { value: 'Brand ink' } });
    fireEvent.blur(name);
    expect(useDreamStore.getState().doc.projectColors?.[0]?.name).toBe('Brand ink');

    const value = screen.getByRole('textbox', { name: 'Change Brand ink' });
    fireEvent.change(value, { target: { value: '#654321' } });
    fireEvent.blur(value);
    expect(useDreamStore.getState().doc.projectColors?.[0]?.value).toBe('#654321');
    expect(screen.getByText('Text 8.83:1 · AA')).toBeInTheDocument();
    fireEvent.change(value, { target: { value: '#777777' } });
    fireEvent.blur(value);
    expect(screen.getByText('Text 4.48:1 · Below AA')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Color #dc2626' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Brand ink' }));
    expect(useDreamStore.getState().settings.color).toBe('#777777');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Brand ink' }));
    expect(useDreamStore.getState().doc.projectColors).toEqual([]);
    useDreamStore.getState().undo();
    expect(useDreamStore.getState().doc.projectColors?.[0]?.name).toBe('Brand ink');
  });

  it('hides the link control in Draw mode and reveals it for a Design selection', async () => {
    useDreamStore.getState().setColor('#2563eb');
    useDreamStore.getState().addProjectColor('Brand', '#2563eb');
    render(<ToolOptionsPanel />);
    expect(screen.queryByRole('button', { name: 'Link the selection to Brand' })).toBeNull();

    // Draw a shape, enter Design, select it — the link button appears.
    useDreamStore.getState().setTool('rectangle');
    useDreamStore.getState().setSize(2);
    useDreamStore.getState().pointerDown({ x: 10, y: 10 });
    useDreamStore.getState().pointerUp({ x: 30, y: 30 });
    useDreamStore.getState().setMode('design');
    const opId = useDreamStore.getState().doc.layers[0].operations[0].id;
    useDreamStore.getState().setSelection([opId]);

    const link = await screen.findByRole('button', { name: 'Link the selection to Brand' });
    fireEvent.click(link);
    expect(useDreamStore.getState().doc.layers[0].operations[0]).toMatchObject({
      colorRef: useDreamStore.getState().doc.projectColors![0].id,
      color: '#2563eb',
    });

    // The button flips to "Linked" and pressing again unlinks.
    const unlink = screen.getByRole('button', { name: 'Unlink the selection from Brand' });
    fireEvent.click(unlink);
    expect(useDreamStore.getState().doc.layers[0].operations[0].colorRef).toBeUndefined();
  });
});
