import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDreamStore } from '../store/dreamStore';
import { PlayPanel } from './PlayPanel';

beforeEach(() => {
  const store = useDreamStore.getState();
  store.newDocument({ width: 320, height: 180 });
  store.renameLayer(useDreamStore.getState().doc.layers[0].id, 'Rocket');
  store.createCastLayer('Clouds');
});

afterEach(cleanup);

describe('PlayPanel game maker', () => {
  it('applies a conversational plan to template, settings and cast', () => {
    render(<PlayPanel />);

    fireEvent.change(screen.getByLabelText('Describe your game'), {
      target: { value: 'My Rocket flies through Clouds, nice and slow' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make game' }));

    const doc = useDreamStore.getState().doc;
    expect(doc.game?.template).toBe('flappy');
    expect(doc.game?.settings?.fallSpeed).toBe(110);
    expect(doc.game?.cast.hero).toBe(doc.layers.find((layer) => layer.name === 'Rocket')?.id);
    expect(doc.game?.cast.obstacle).toBe(doc.layers.find((layer) => layer.name === 'Clouds')?.id);
    expect(screen.getByRole('status')).toHaveTextContent('Flappy Dream is ready — press Play!');
  });

  it('prepares Dream Jumper from run-and-jump language', () => {
    render(<PlayPanel />);

    fireEvent.change(screen.getByLabelText('Describe your game'), {
      target: { value: 'Rocket should run and jump over Clouds to reach the flag' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make game' }));

    const doc = useDreamStore.getState().doc;
    expect(doc.game?.template).toBe('platformer');
    expect(doc.game?.cast.hero).toBe(doc.layers.find((layer) => layer.name === 'Rocket')?.id);
    expect(doc.game?.cast.obstacle).toBe(doc.layers.find((layer) => layer.name === 'Clouds')?.id);
    expect(screen.getByRole('status')).toHaveTextContent('Dream Jumper is ready — press Play!');
  });
});
