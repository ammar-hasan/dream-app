import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocument } from '../engine/document';
import type { DreamDocument } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { OpenDialog } from './OpenDialog';

const storage = vi.hoisted(() => ({
  listProjects: vi.fn(),
  loadProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock('../storage/projects', () => storage);

beforeEach(() => {
  localStorage.clear();
  storage.listProjects.mockResolvedValue([
    { id: 'saved', name: 'Saved dream', width: 320, height: 180, updatedAt: 1 },
  ]);
  storage.deleteProject.mockResolvedValue(undefined);
  useDreamStore
    .getState()
    .loadDocument(createDocument({ id: 'current', name: 'Current work', width: 100, height: 100 }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OpenDialog project progress', () => {
  it('cancels immediately and ignores a late saved project', async () => {
    let finish: ((doc: DreamDocument) => void) | undefined;
    storage.loadProject.mockReturnValue(
      new Promise<DreamDocument>((resolve) => {
        finish = resolve;
      }),
    );
    const onClose = vi.fn();
    render(<OpenDialog onClose={onClose} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Saved dream 320/ }));
    expect(
      screen.getByRole('progressbar', { name: 'Restoring images, layers and frames…' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open .dream file…' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.getByText('Stopped opening. Your current work was not changed.')).toBeVisible(),
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    await act(async () => {
      finish?.(createDocument({ id: 'late', name: 'Late project', width: 100, height: 100 }));
      await Promise.resolve();
    });
    expect(useDreamStore.getState().doc.id).toBe('current');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps current work and explains when a saved project is missing', async () => {
    storage.loadProject.mockResolvedValue(undefined);
    render(<OpenDialog onClose={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Saved dream 320/ }));
    await waitFor(() =>
      expect(
        screen.getByText(
          'That saved project could not be opened. Your current work is still here.',
        ),
      ).toBeVisible(),
    );
    expect(useDreamStore.getState().doc.id).toBe('current');
  });
});
