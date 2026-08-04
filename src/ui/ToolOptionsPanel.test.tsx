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
});
