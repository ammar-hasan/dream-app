import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

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
});
