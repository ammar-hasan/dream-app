/**
 * Voice-command parser — a pure transcript → intent module (no DOM, no
 * store). Case-insensitive and tolerant of filler words ("um, can you please
 * undo?"), so kids and grandparents alike can just talk. Anything it doesn't
 * understand parses to null and the caller says so kindly.
 *
 * The parser is a dumb keyword matcher over per-locale vocabulary tables:
 * English is the base and other locales (Arabic so far) merge their words in
 * alongside it — English commands keep working no matter the UI language.
 * Arabic transcripts are normalized first (diacritics/tatweel stripped, alef
 * forms unified) so "شغّل" and "شغل" match the same word.
 */

import type { Color, GameTemplateId, ToolId } from '../engine/types';

export type VoiceCommand =
  | { kind: 'undo' }
  | { kind: 'redo' }
  /** Ask the user to confirm clearing the active layer. */
  | { kind: 'clear' }
  | { kind: 'confirm' }
  | { kind: 'cancel' }
  | { kind: 'new-frame' }
  /** Open the confirmable storyboard builder, optionally prefilled by speech. */
  | { kind: 'storyboard'; prompt?: string }
  | { kind: 'play' }
  /** "play my game": switch to Play mode and start a run. An optional
   *  template ("play flappy", "play maze", "play catch") selects it first. */
  | { kind: 'play-game'; template?: GameTemplateId }
  /** "preview my app": open Present mode as an interactive prototype. */
  | { kind: 'preview-app' }
  /** "export my app": download the standalone HTML prototype. */
  | { kind: 'export-app' }
  /** "export real code" / "make it real": the AI code export. */
  | { kind: 'export-code' }
  | { kind: 'stop' }
  /** "record narration": start a voice take over the playing animation. */
  | { kind: 'record-narration' }
  /** "stop recording": finish and save the take. */
  | { kind: 'stop-recording' }
  /** "delete narration": remove the saved take. */
  | { kind: 'delete-narration' }
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
  stamp: 'stamp',
  sticker: 'stamp',
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

/** Everything the matcher needs, in one data table per locale. */
export interface VoiceVocabulary {
  filler: Set<string>;
  colors: Record<string, Color>;
  tools: Record<string, ToolId>;
  yes: Set<string>;
  no: Set<string>;
  bigger: Set<string>;
  smaller: Set<string>;
  clear: Set<string>;
  play: Set<string>;
  stop: Set<string>;
  undo: Set<string>;
  redo: Set<string>;
  help: Set<string>;
  save: Set<string>;
  game: Set<string>;
  /** Template names for "play flappy" / "play maze" / "play catch". */
  templates: Record<GameTemplateId, Set<string>>;
  app: Set<string>;
  appPreview: Set<string>;
  appExport: Set<string>;
  /** "code" words for the make-real export ("export real code"). */
  code: Set<string>;
  mirror: Set<string>;
  clearPhrases: string[];
  newFramePhrases: string[];
  mirrorOnPhrases: string[];
  mirrorOffPhrases: string[];
  /** Whole-phrase ways to ask for the code export ("make it real"). */
  codePhrases: string[];
  /** "record narration" — checked early: they contain stop/clear words. */
  narrationRecordPhrases: string[];
  narrationStopPhrases: string[];
  narrationDeletePhrases: string[];
  /** Outcome-level animation creation phrases; trailing words become the story. */
  storyboardPhrases: string[];
}

const EN_VOCAB: VoiceVocabulary = {
  filler: FILLER_WORDS,
  colors: COLOR_WORDS,
  tools: TOOL_WORDS,
  yes: new Set(['yes', 'yeah', 'yep', 'sure', 'confirm', 'definitely', 'absolutely']),
  no: new Set(['no', 'nope', 'cancel', 'nevermind', "don't", 'dont']),
  bigger: new Set(['bigger', 'larger', 'thicker', 'grow', 'huge', 'giant']),
  smaller: new Set(['smaller', 'thinner', 'shrink', 'tiny', 'small']),
  clear: new Set(['clear', 'wipe', 'clean']),
  play: new Set(['play', 'animate', 'roll']),
  stop: new Set(['stop', 'pause', 'halt', 'freeze']),
  undo: new Set(['undo', 'oops']),
  redo: new Set(['redo']),
  help: new Set(['help', 'commands', 'options']),
  save: new Set(['save']),
  game: new Set(['game', 'games']),
  templates: {
    catch: new Set(['catch', 'catching']),
    flappy: new Set(['flappy', 'flap', 'fly', 'flying', 'bird']),
    maze: new Set(['maze', 'labyrinth']),
    platformer: new Set(['platformer', 'platform', 'jumper', 'jumping']),
  },
  app: new Set(['app', 'prototype']),
  appPreview: new Set(['preview', 'try', 'test', 'open', 'show']),
  appExport: new Set(['export', 'download', 'share', 'send']),
  code: new Set(['code', 'html']),
  mirror: new Set(['mirror', 'symmetry', 'mirroring']),
  clearPhrases: ['erase everything', 'delete everything', 'start over', 'wipe it'],
  newFramePhrases: ['new frame', 'add frame', 'another frame', 'next frame'],
  mirrorOnPhrases: ['mirror on', 'symmetry on', 'mirroring on'],
  mirrorOffPhrases: ['mirror off', 'symmetry off', 'mirroring off'],
  codePhrases: [
    'make real',
    'make it real',
    'real code',
    'export code',
    'code export',
    'turn it into code',
  ],
  narrationRecordPhrases: [
    'record narration',
    'record my voice',
    'record voice',
    'record a narration',
    'narrate',
    'tell the story',
    'tell a story',
  ],
  narrationStopPhrases: ['stop recording', 'stop narrating', 'finish recording'],
  narrationDeletePhrases: [
    'delete narration',
    'delete the narration',
    'erase narration',
    'remove narration',
    'delete my voice',
  ],
  storyboardPhrases: [
    'make a story about',
    'make a story',
    'make an animation about',
    'make an animation',
    'animate a story about',
    'animate my story about',
  ],
};

/**
 * Arabic additions (العربية), written in normalized form: no diacritics, bare
 * alef. Both teh-marbuta and plain-h spellings are listed where transcripts
 * might differ. Merged INTO English, so mixed sentences keep working.
 */
const AR_VOCAB: VoiceVocabulary = {
  filler: new Set([
    'من',
    'فضلك',
    'لو',
    'سمحت',
    'يا',
    'ارجوك',
    'ارجو',
    'هل',
    'يمكنك',
    'تستطيع',
    'الان',
    'اريد',
    'ان',
    'لي',
    'مع',
  ]),
  colors: {
    احمر: COLOR_WORDS.red,
    برتقالي: COLOR_WORDS.orange,
    اصفر: COLOR_WORDS.yellow,
    اخضر: COLOR_WORDS.green,
    فيروزي: COLOR_WORDS.teal,
    سماوي: COLOR_WORDS.sky,
    ازرق: COLOR_WORDS.blue,
    بنفسجي: COLOR_WORDS.purple,
    وردي: COLOR_WORDS.pink,
    زهري: COLOR_WORDS.pink,
    بني: COLOR_WORDS.brown,
    اسود: COLOR_WORDS.black,
    ابيض: COLOR_WORDS.white,
    رمادي: COLOR_WORDS.gray,
    ذهبي: COLOR_WORDS.gold,
  },
  tools: {
    فرشاة: 'brush',
    قلم: 'pencil',
    رصاص: 'pencil',
    ممحاة: 'eraser',
    رش: 'spray',
    بخاخ: 'spray',
    خط: 'line',
    مستطيل: 'rectangle',
    مربع: 'rectangle',
    بيضاوي: 'ellipse',
    دائرة: 'ellipse',
    دلو: 'fill',
    تعبئة: 'fill',
    املا: 'fill',
    عصا: 'wand',
    سحرية: 'wand',
    لاسو: 'lasso',
    طابع: 'stamp',
    ملصق: 'stamp',
    قطارة: 'eyedropper',
    نص: 'text',
    كتابة: 'text',
  },
  yes: new Set(['نعم', 'ايه', 'ايوه', 'اكيد', 'موافق', 'تمام', 'اوكي']),
  no: new Set(['لا', 'كلا', 'الغي', 'الغاء']),
  bigger: new Set(['اكبر', 'كبر', 'ضخم', 'عملاق']),
  smaller: new Set(['اصغر', 'صغر', 'صغير']),
  clear: new Set(['امسح', 'نظف']),
  play: new Set(['شغل', 'شغلي', 'العب']),
  stop: new Set(['اوقف', 'اوقفي', 'توقف', 'قف', 'ايقاف']),
  undo: new Set(['تراجع', 'رجوع', 'ارجع']),
  redo: new Set(['اعادة', 'اعاده', 'اعد']),
  help: new Set(['مساعدة', 'مساعده', 'اوامر']),
  save: new Set(['احفظ', 'حفظ', 'خزن']),
  game: new Set(['لعبة', 'لعبه', 'لعبتي', 'العاب']),
  templates: {
    catch: new Set(['الصيد', 'صيد', 'التقاط']),
    flappy: new Set(['الطيران', 'طيران', 'فلابي', 'الطائر', 'طائر']),
    maze: new Set(['المتاهة', 'متاهة', 'متاهه']),
    platformer: new Set(['منصات', 'المنصات', 'قفز', 'القفز']),
  },
  app: new Set(['تطبيق', 'تطبيقي', 'التطبيق', 'برنامج']),
  appPreview: new Set(['عاين', 'معاينة', 'معاينه', 'جرب', 'افتح', 'اعرض']),
  appExport: new Set(['صدر', 'صدري', 'تصدير', 'حمل', 'نزل', 'شارك']),
  code: new Set(['كود']),
  mirror: new Set(['مراية', 'مرايه', 'تناظر', 'تطابق']),
  clearPhrases: ['امسح كل شيء', 'احذف كل شيء', 'ابدا من جديد', 'نظف اللوحة'],
  newFramePhrases: ['اطار جديد', 'فريم جديد', 'اضف اطار', 'اطار اخر'],
  mirrorOnPhrases: ['شغل التناظر', 'فعل التناظر', 'شغل المراية', 'تناظر شغال'],
  mirrorOffPhrases: ['اطف التناظر', 'اطفي التناظر', 'اطفي المراية', 'بدون تناظر'],
  codePhrases: ['كود حقيقي', 'صدر كود حقيقي', 'صدر الكود', 'حوله الي كود'],
  narrationRecordPhrases: ['سجل صوتي', 'سجل الصوت', 'سجل تعليق', 'احك القصة', 'احكي القصة'],
  narrationStopPhrases: ['اوقف التسجيل', 'اوقفي التسجيل', 'انهي التسجيل', 'انهاء التسجيل'],
  narrationDeletePhrases: ['امسح الصوت', 'احذف الصوت', 'امسح التسجيل', 'احذف التسجيل', 'امسح صوتي'],
  storyboardPhrases: [
    'اصنع قصة عن',
    'اصنع لي قصة عن',
    'اصنع قصة',
    'اصنع لي قصة',
    'اصنع رسوما متحركة عن',
    'حول قصتي الى رسوم',
  ],
};

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a, ...b]);
}

/** Merge a locale's vocabulary into the English base (English always works). */
function mergeVocabulary(base: VoiceVocabulary, extra: VoiceVocabulary): VoiceVocabulary {
  return {
    filler: union(base.filler, extra.filler),
    colors: { ...base.colors, ...extra.colors },
    tools: { ...base.tools, ...extra.tools },
    yes: union(base.yes, extra.yes),
    no: union(base.no, extra.no),
    bigger: union(base.bigger, extra.bigger),
    smaller: union(base.smaller, extra.smaller),
    clear: union(base.clear, extra.clear),
    play: union(base.play, extra.play),
    stop: union(base.stop, extra.stop),
    undo: union(base.undo, extra.undo),
    redo: union(base.redo, extra.redo),
    help: union(base.help, extra.help),
    save: union(base.save, extra.save),
    game: union(base.game, extra.game),
    templates: {
      catch: union(base.templates.catch, extra.templates.catch),
      flappy: union(base.templates.flappy, extra.templates.flappy),
      maze: union(base.templates.maze, extra.templates.maze),
      platformer: union(base.templates.platformer, extra.templates.platformer),
    },
    app: union(base.app, extra.app),
    appPreview: union(base.appPreview, extra.appPreview),
    appExport: union(base.appExport, extra.appExport),
    code: union(base.code, extra.code),
    mirror: union(base.mirror, extra.mirror),
    clearPhrases: [...base.clearPhrases, ...extra.clearPhrases],
    newFramePhrases: [...base.newFramePhrases, ...extra.newFramePhrases],
    mirrorOnPhrases: [...base.mirrorOnPhrases, ...extra.mirrorOnPhrases],
    mirrorOffPhrases: [...base.mirrorOffPhrases, ...extra.mirrorOffPhrases],
    codePhrases: [...base.codePhrases, ...extra.codePhrases],
    narrationRecordPhrases: [...base.narrationRecordPhrases, ...extra.narrationRecordPhrases],
    narrationStopPhrases: [...base.narrationStopPhrases, ...extra.narrationStopPhrases],
    narrationDeletePhrases: [...base.narrationDeletePhrases, ...extra.narrationDeletePhrases],
    storyboardPhrases: [...base.storyboardPhrases, ...extra.storyboardPhrases],
  };
}

const LOCALE_VOCABULARIES: Record<string, VoiceVocabulary> = {
  ar: mergeVocabulary(EN_VOCAB, AR_VOCAB),
};

/** The vocabulary for a UI locale; unknown locales get plain English. */
export function vocabularyFor(locale: string): VoiceVocabulary {
  return LOCALE_VOCABULARIES[locale] ?? EN_VOCAB;
}

/**
 * Normalize Arabic orthography so transcripts match the vocabulary tables:
 * strip harakat/tanwin/shadda/dagger-alef and tatweel, unify alef forms and
 * alef-maqsura. A no-op for English text.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي');
}

/** Tokenize: lowercase, normalize Arabic, drop punctuation, remove filler. */
export function tokenize(transcript: string, filler: Set<string> = FILLER_WORDS): string[] {
  return normalizeArabic(transcript.toLowerCase())
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .split(/\s+/)
    .filter((word) => word !== '' && !filler.has(word));
}

function has(tokens: Set<string>, words: Set<string>): boolean {
  for (const token of tokens) {
    if (words.has(token)) return true;
  }
  return false;
}

function colorIn(
  tokens: Set<string>,
  colors: Record<string, Color>,
): { color: Color; name: string } | null {
  for (const token of tokens) {
    const color = colors[token];
    if (color) return { color, name: token };
  }
  return null;
}

function toolIn(tokens: Set<string>, tools: Record<string, ToolId>): ToolId | null {
  for (const token of tokens) {
    const tool = tools[token];
    if (tool) return tool;
  }
  return null;
}

function templateIn(
  tokens: Set<string>,
  templates: Record<GameTemplateId, Set<string>>,
): GameTemplateId | null {
  for (const id of ['catch', 'flappy', 'maze', 'platformer'] as const) {
    if (has(tokens, templates[id])) return id;
  }
  return null;
}

/** Phrase-level checks that single tokens can't express. */
function hasPhrase(normalized: string, ...phrases: string[]): boolean {
  return phrases.some((p) => normalized.includes(p));
}

function storyboardRequest(
  normalized: string,
  phrases: readonly string[],
): { matched: boolean; prompt?: string } {
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    const index = normalized.indexOf(phrase);
    if (index === -1) continue;
    const prompt = normalized
      .slice(index + phrase.length)
      .trim()
      .replace(/^(?:about|where|with|of|عن|حول|فيها)\s+/u, '')
      .trim();
    return prompt ? { matched: true, prompt } : { matched: true };
  }
  return { matched: false };
}

/**
 * Parse a transcript into a command intent, or null when nothing matches.
 * `locale` picks the vocabulary ('ar' adds Arabic words to the English base).
 * Order matters: confirmations and destructive requests win over tools, and
 * "fill red" is recognized before a bare color so both intents survive.
 */
export function parseVoiceCommand(transcript: string, locale = 'en'): VoiceCommand | null {
  const vocab = vocabularyFor(locale);
  // Arabic marks are stripped BEFORE punctuation removal — a shadda is a
  // Unicode mark and would otherwise turn into a word-breaking space.
  const normalized = normalizeArabic(transcript.toLowerCase())
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .trim();
  const tokens = new Set(tokenize(transcript, vocab.filler));
  if (tokens.size === 0) return null;

  // Confirmations are tiny sentences ("yes", "no thanks") — match them first,
  // but only when the raw message is a word or two, so "yes, make it red"
  // still falls through to the color command.
  const rawWordCount = normalized.split(/\s+/).filter((w) => w !== '').length;
  if (rawWordCount <= 2) {
    if (has(tokens, vocab.yes)) return { kind: 'confirm' };
    if (has(tokens, vocab.no)) return { kind: 'cancel' };
  }

  if (has(tokens, vocab.help)) return { kind: 'help' };
  if (has(tokens, vocab.undo)) return { kind: 'undo' };
  if (has(tokens, vocab.redo)) return { kind: 'redo' };

  const storyboard = storyboardRequest(normalized, vocab.storyboardPhrases);
  if (storyboard.matched) {
    return storyboard.prompt
      ? { kind: 'storyboard', prompt: storyboard.prompt }
      : { kind: 'storyboard' };
  }

  // Narration phrases win over the words they contain: "stop recording"
  // holds a stop word, and Arabic «امسح الصوت» (delete narration) holds the
  // clear word امسح — neither is a stop or a clear.
  if (hasPhrase(normalized, ...vocab.narrationStopPhrases)) {
    return { kind: 'stop-recording' };
  }
  if (hasPhrase(normalized, ...vocab.narrationDeletePhrases)) {
    return { kind: 'delete-narration' };
  }
  if (hasPhrase(normalized, ...vocab.narrationRecordPhrases)) {
    return { kind: 'record-narration' };
  }

  const isClearAll = has(tokens, vocab.clear) || hasPhrase(normalized, ...vocab.clearPhrases);
  if (isClearAll) return { kind: 'clear' };

  if (hasPhrase(normalized, ...vocab.newFramePhrases)) {
    return { kind: 'new-frame' };
  }

  // Mirror PHRASES win over play/stop: Arabic "شغّل التناظر" (mirror on)
  // contains a play word, and we must not start playback for it.
  if (hasPhrase(normalized, ...vocab.mirrorOffPhrases)) {
    return { kind: 'mirror', on: false };
  }
  if (hasPhrase(normalized, ...vocab.mirrorOnPhrases)) {
    return { kind: 'mirror', on: true };
  }

  // Make-real code export: "export real code", "make it real", "كود حقيقي" —
  // checked before the app block so "export code" never becomes "export app".
  if (has(tokens, vocab.code) && (has(tokens, vocab.appExport) || has(tokens, vocab.app))) {
    return { kind: 'export-code' };
  }
  if (hasPhrase(normalized, ...vocab.codePhrases)) {
    return { kind: 'export-code' };
  }

  // App mode: "preview my app" / "export my app" — checked before a bare
  // "play"/"stop" so app phrases never fall through to playback.
  if (has(tokens, vocab.app)) {
    if (has(tokens, vocab.appPreview)) {
      return { kind: 'preview-app' };
    }
    if (has(tokens, vocab.appExport)) {
      return { kind: 'export-app' };
    }
  }

  if (has(tokens, vocab.stop)) return { kind: 'stop' };
  // Game templates: "play flappy" / "play maze" / "play platformer" — a template
  // word with a play/game word (or all alone) picks that game and starts it.
  const template = templateIn(tokens, vocab.templates);
  if (template && (has(tokens, vocab.play) || has(tokens, vocab.game) || tokens.size === 1)) {
    return { kind: 'play-game', template };
  }
  // "play my game" beats a bare "play" (which is animation playback).
  if (has(tokens, vocab.game)) return { kind: 'play-game' };
  if (has(tokens, vocab.play)) return { kind: 'play' };
  if (has(tokens, vocab.save)) return { kind: 'save' };
  if (has(tokens, vocab.bigger)) return { kind: 'bigger' };
  if (has(tokens, vocab.smaller)) return { kind: 'smaller' };

  // A bare mirror word ("mirror", "مراية") toggles symmetry on.
  if (has(tokens, vocab.mirror)) {
    return { kind: 'mirror', on: true };
  }

  const color = colorIn(tokens, vocab.colors);
  const tool = toolIn(tokens, vocab.tools);
  if (tool === 'fill' && color) return { kind: 'fill-color', ...color };
  if (tool) return { kind: 'tool', tool };
  if (color) return { kind: 'color', ...color };

  return null;
}
