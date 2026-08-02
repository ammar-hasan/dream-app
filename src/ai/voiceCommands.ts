/**
 * Voice-command parser — a pure transcript → intent module (no DOM, no
 * store). Case-insensitive and tolerant of filler words ("um, can you please
 * undo?"), so kids and grandparents alike can just talk. Anything it doesn't
 * understand parses to null and the caller says so kindly.
 *
 * The vocabulary is English for now; recognition in other languages still
 * produces transcripts, they just may not match — the executor reports
 * "didn't understand" and suggests "help".
 */

import type { Color, ToolId } from '../engine/types';

export type VoiceCommand =
  | { kind: 'undo' }
  | { kind: 'redo' }
  /** Ask the user to confirm clearing the active layer. */
  | { kind: 'clear' }
  | { kind: 'confirm' }
  | { kind: 'cancel' }
  | { kind: 'new-frame' }
  | { kind: 'play' }
  /** "play my game": switch to Play mode and start a Catch! run. */
  | { kind: 'play-game' }
  | { kind: 'stop' }
  | { kind: 'tool'; tool: ToolId }
  /** "mirror on" / "mirror off": toggle vertical mirror symmetry. */
  | { kind: 'mirror'; on: boolean }
  | { kind: 'color'; color: Color; name: string }
  /** "fill red": pick the color AND the fill bucket in one breath. */
  | { kind: 'fill-color'; color: Color; name: string }
  | { kind: 'bigger' }
  | { kind: 'smaller' }
  | { kind: 'save' }
  | { kind: 'help' };

/** Friendly color vocabulary shared with the kid palette where possible. */
export const COLOR_WORDS: Record<string, Color> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#facc15',
  green: '#22c55e',
  teal: '#14b8a6',
  sky: '#38bdf8',
  blue: '#3b82f6',
  purple: '#a855f7',
  violet: '#a855f7',
  pink: '#ec4899',
  brown: '#92400e',
  black: '#1f2937',
  white: '#ffffff',
  gray: '#6b7280',
  grey: '#6b7280',
  cyan: '#06b6d4',
  magenta: '#d946ef',
  gold: '#eab308',
  lime: '#84cc16',
  navy: '#1e3a8a',
  peach: '#fdba74',
  lavender: '#c4b5fd',
};

const TOOL_WORDS: Record<string, ToolId> = {
  brush: 'brush',
  paint: 'brush',
  paintbrush: 'brush',
  pencil: 'pencil',
  eraser: 'eraser',
  erase: 'eraser',
  rubber: 'eraser',
  spray: 'spray',
  airbrush: 'spray',
  line: 'line',
  rectangle: 'rectangle',
  square: 'rectangle',
  box: 'rectangle',
  ellipse: 'ellipse',
  circle: 'ellipse',
  oval: 'ellipse',
  fill: 'fill',
  bucket: 'fill',
  wand: 'wand',
  lasso: 'lasso',
  eyedropper: 'eyedropper',
  dropper: 'eyedropper',
  text: 'text',
};

/** Words that add politeness, not meaning — stripped before matching. */
const FILLER_WORDS = new Set([
  'please',
  'can',
  'could',
  'would',
  'you',
  'the',
  'a',
  'an',
  'um',
  'uh',
  'hey',
  'ok',
  'okay',
  'dream',
  'now',
  'me',
  'my',
  'to',
  'just',
  'go',
  'ahead',
  'let',
  'lets',
  'i',
  'want',
  'wanna',
  'make',
  'do',
  'it',
  'some',
  'with',
  'use',
  'switch',
  'change',
  'select',
  'pick',
  'choose',
  'tool',
  'little',
  'bit',
  'for',
  'on',
  'of',
  'in',
  'and',
  'that',
  'this',
  'there',
]);

const YES_WORDS = new Set(['yes', 'yeah', 'yep', 'sure', 'confirm', 'definitely', 'absolutely']);
const NO_WORDS = new Set(['no', 'nope', 'cancel', 'nevermind', "don't", 'dont']);
const BIGGER_WORDS = new Set(['bigger', 'larger', 'thicker', 'grow', 'huge', 'giant']);
const SMALLER_WORDS = new Set(['smaller', 'thinner', 'shrink', 'tiny', 'small']);
const CLEAR_WORDS = new Set(['clear', 'wipe', 'clean']);
const PLAY_WORDS = new Set(['play', 'animate', 'roll']);
const STOP_WORDS = new Set(['stop', 'pause', 'halt', 'freeze']);

/** Tokenize: lowercase, drop punctuation, remove filler words. */
export function tokenize(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .split(/\s+/)
    .filter((word) => word !== '' && !FILLER_WORDS.has(word));
}

function has(tokens: Set<string>, words: Set<string>): boolean {
  for (const token of tokens) {
    if (words.has(token)) return true;
  }
  return false;
}

function colorIn(tokens: Set<string>): { color: Color; name: string } | null {
  for (const token of tokens) {
    const color = COLOR_WORDS[token];
    if (color) return { color, name: token };
  }
  return null;
}

function toolIn(tokens: Set<string>): ToolId | null {
  for (const token of tokens) {
    const tool = TOOL_WORDS[token];
    if (tool) return tool;
  }
  return null;
}

/** Phrase-level checks that single tokens can't express. */
function hasPhrase(normalized: string, ...phrases: string[]): boolean {
  return phrases.some((p) => normalized.includes(p));
}

/**
 * Parse a transcript into a command intent, or null when nothing matches.
 * Order matters: confirmations and destructive requests win over tools, and
 * "fill red" is recognized before a bare color so both intents survive.
 */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .trim();
  const tokens = new Set(tokenize(transcript));
  if (tokens.size === 0) return null;

  // Confirmations are tiny sentences ("yes", "no thanks") — match them first,
  // but only when the raw message is a word or two, so "yes, make it red"
  // still falls through to the color command.
  const rawWordCount = normalized.split(/\s+/).filter((w) => w !== '').length;
  if (rawWordCount <= 2) {
    if (has(tokens, YES_WORDS)) return { kind: 'confirm' };
    if (has(tokens, NO_WORDS)) return { kind: 'cancel' };
  }

  if (has(tokens, new Set(['help', 'commands', 'options']))) return { kind: 'help' };
  if (has(tokens, new Set(['undo', 'oops']))) return { kind: 'undo' };
  if (has(tokens, new Set(['redo']))) return { kind: 'redo' };

  const isClearAll =
    has(tokens, CLEAR_WORDS) ||
    hasPhrase(normalized, 'erase everything', 'delete everything', 'start over', 'wipe it');
  if (isClearAll) return { kind: 'clear' };

  if (hasPhrase(normalized, 'new frame', 'add frame', 'another frame', 'next frame')) {
    return { kind: 'new-frame' };
  }

  if (has(tokens, STOP_WORDS)) return { kind: 'stop' };
  // "play my game" beats a bare "play" (which is animation playback).
  if (has(tokens, new Set(['game', 'games']))) return { kind: 'play-game' };
  if (has(tokens, PLAY_WORDS)) return { kind: 'play' };
  if (has(tokens, new Set(['save']))) return { kind: 'save' };
  if (has(tokens, BIGGER_WORDS)) return { kind: 'bigger' };
  if (has(tokens, SMALLER_WORDS)) return { kind: 'smaller' };

  // Mirror / symmetry: "mirror on", "turn the symmetry off", or a bare
  // "mirror" toggles it on. Phrases win over the bare-word fallback.
  if (hasPhrase(normalized, 'mirror off', 'symmetry off', 'mirroring off')) {
    return { kind: 'mirror', on: false };
  }
  if (
    hasPhrase(normalized, 'mirror on', 'symmetry on', 'mirroring on') ||
    has(tokens, new Set(['mirror', 'symmetry', 'mirroring']))
  ) {
    return { kind: 'mirror', on: true };
  }

  const color = colorIn(tokens);
  const tool = toolIn(tokens);
  if (tool === 'fill' && color) return { kind: 'fill-color', ...color };
  if (tool) return { kind: 'tool', tool };
  if (color) return { kind: 'color', ...color };

  return null;
}
