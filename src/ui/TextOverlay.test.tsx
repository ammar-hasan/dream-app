import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDreamStore } from '../store/dreamStore';
import { TextOverlay } from './TextOverlay';

const originalCommitText = useDreamStore.getState().commitText;

afterEach(() => {
  cleanup();
  useDreamStore.setState({ commitText: originalCommitText });
});

describe('TextOverlay science symbols', () => {
  it('inserts a symbol at the caret before committing the text', () => {
    const commitText = vi.fn();
    useDreamStore.setState({ commitText });
    render(<TextOverlay screenPos={{ x: 10, y: 20 }} />);

    const input = screen.getByRole('textbox', {
      name: 'Text input',
    }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'H2O' } });
    input.setSelectionRange(1, 2);
    fireEvent.click(screen.getByRole('button', { name: '₂' }));
    expect(input).toHaveValue('H₂O');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(commitText).toHaveBeenCalledWith('H₂O');
  });
});
