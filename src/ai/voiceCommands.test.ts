/** Voice-command parser: intents, filler tolerance, color vocabulary. */

import { describe, expect, it } from 'vitest';
import { COLOR_WORDS, parseVoiceCommand, tokenize } from './voiceCommands';

describe('tokenize', () => {
  it('lowercases, drops punctuation and removes filler words', () => {
    expect(tokenize('Um, can you PLEASE undo that?')).toEqual(['undo']);
  });

  it('keeps meaningful words in order', () => {
    expect(tokenize('fill it RED')).toEqual(['fill', 'red']);
  });
});

describe('parseVoiceCommand — history & document', () => {
  it('parses undo, even wrapped in politeness', () => {
    expect(parseVoiceCommand('undo')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('um hey dream can you please undo')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('oops')).toEqual({ kind: 'undo' });
  });

  it('parses redo', () => {
    expect(parseVoiceCommand('redo')).toEqual({ kind: 'redo' });
    expect(parseVoiceCommand('please redo that for me')).toEqual({ kind: 'redo' });
  });

  it('parses clear requests (destructive — confirmed by the executor)', () => {
    expect(parseVoiceCommand('clear')).toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('clear the layer')).toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('erase everything')).toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('start over')).toEqual({ kind: 'clear' });
  });

  it('parses confirmations and cancellations', () => {
    expect(parseVoiceCommand('yes')).toEqual({ kind: 'confirm' });
    expect(parseVoiceCommand('yeah sure')).toEqual({ kind: 'confirm' });
    expect(parseVoiceCommand('no')).toEqual({ kind: 'cancel' });
    expect(parseVoiceCommand('cancel')).toEqual({ kind: 'cancel' });
    expect(parseVoiceCommand('nevermind')).toEqual({ kind: 'cancel' });
  });

  it('does not treat a longer sentence starting with yes as a confirmation', () => {
    expect(parseVoiceCommand('yes make it red')).toEqual({
      kind: 'color',
      color: COLOR_WORDS.red,
      name: 'red',
    });
  });

  it('parses save', () => {
    expect(parseVoiceCommand('save')).toEqual({ kind: 'save' });
    expect(parseVoiceCommand('please save my drawing')).toEqual({ kind: 'save' });
  });

  it('parses help', () => {
    expect(parseVoiceCommand('help')).toEqual({ kind: 'help' });
    expect(parseVoiceCommand('what commands can I say')).toEqual({ kind: 'help' });
  });
});

describe('parseVoiceCommand — animation', () => {
  it('parses new frame phrases', () => {
    expect(parseVoiceCommand('new frame')).toEqual({ kind: 'new-frame' });
    expect(parseVoiceCommand('add another frame please')).toEqual({ kind: 'new-frame' });
  });

  it('parses play and stop', () => {
    expect(parseVoiceCommand('play')).toEqual({ kind: 'play' });
    expect(parseVoiceCommand('stop')).toEqual({ kind: 'stop' });
    expect(parseVoiceCommand('pause it')).toEqual({ kind: 'stop' });
  });
});

describe('parseVoiceCommand — tools, colors, sizes', () => {
  it('parses tool commands including friendly aliases', () => {
    expect(parseVoiceCommand('brush')).toEqual({ kind: 'tool', tool: 'brush' });
    expect(parseVoiceCommand('eraser')).toEqual({ kind: 'tool', tool: 'eraser' });
    expect(parseVoiceCommand('fill')).toEqual({ kind: 'tool', tool: 'fill' });
    expect(parseVoiceCommand('circle')).toEqual({ kind: 'tool', tool: 'ellipse' });
    expect(parseVoiceCommand('square')).toEqual({ kind: 'tool', tool: 'rectangle' });
    expect(parseVoiceCommand('use the pencil')).toEqual({ kind: 'tool', tool: 'pencil' });
  });

  it('parses the friendly color vocabulary', () => {
    for (const [word, color] of Object.entries(COLOR_WORDS)) {
      expect(parseVoiceCommand(word)).toEqual({ kind: 'color', color, name: word });
    }
  });

  it('parses "fill red" as color + fill in one command', () => {
    expect(parseVoiceCommand('fill red')).toEqual({
      kind: 'fill-color',
      color: COLOR_WORDS.red,
      name: 'red',
    });
    expect(parseVoiceCommand('fill it blue')).toEqual({
      kind: 'fill-color',
      color: COLOR_WORDS.blue,
      name: 'blue',
    });
  });

  it('parses brush size changes', () => {
    expect(parseVoiceCommand('bigger')).toEqual({ kind: 'bigger' });
    expect(parseVoiceCommand('make it bigger')).toEqual({ kind: 'bigger' });
    expect(parseVoiceCommand('smaller')).toEqual({ kind: 'smaller' });
    expect(parseVoiceCommand('a tiny brush please')).toEqual({ kind: 'smaller' });
  });

  it('parses the new slice-9 tools', () => {
    expect(parseVoiceCommand('spray')).toEqual({ kind: 'tool', tool: 'spray' });
    expect(parseVoiceCommand('airbrush')).toEqual({ kind: 'tool', tool: 'spray' });
    expect(parseVoiceCommand('wand')).toEqual({ kind: 'tool', tool: 'wand' });
    expect(parseVoiceCommand('magic wand')).toEqual({ kind: 'tool', tool: 'wand' });
    expect(parseVoiceCommand('lasso')).toEqual({ kind: 'tool', tool: 'lasso' });
  });

  it('parses mirror on / mirror off', () => {
    expect(parseVoiceCommand('mirror on')).toEqual({ kind: 'mirror', on: true });
    expect(parseVoiceCommand('turn the mirror on')).toEqual({ kind: 'mirror', on: true });
    expect(parseVoiceCommand('mirror off')).toEqual({ kind: 'mirror', on: false });
    expect(parseVoiceCommand('symmetry off')).toEqual({ kind: 'mirror', on: false });
    expect(parseVoiceCommand('mirror')).toEqual({ kind: 'mirror', on: true });
  });
});

describe('parseVoiceCommand — unknown input', () => {
  it('returns null for noise and unrelated sentences', () => {
    expect(parseVoiceCommand('')).toBeNull();
    expect(parseVoiceCommand('um uh')).toBeNull();
    expect(parseVoiceCommand('what is the weather today')).toBeNull();
    expect(parseVoiceCommand('flibberty gibbet')).toBeNull();
  });
});
