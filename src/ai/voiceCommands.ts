/**
 * Voice-command parser — a pure transcript → intent module (no DOM, no
 * store). Case-insensitive and tolerant of filler words ("um, can you please
 * undo?"), so kids and grandparents alike can just talk. Anything it doesn't
 * understand parses to null and the caller says so kindly.
 *
 * The parser is a dumb keyword matcher over per-locale vocabulary tables:
 * English is the base and other locales merge their words in
 * alongside it — English commands keep working no matter the UI language.
 * Arabic transcripts are normalized first (diacritics/tatweel stripped, alef
 * forms unified) so "شغّل" and "شغل" match the same word.
 */

import type { Color, GameTemplateId, ToolId } from '../engine/types';

export type SelectionDirection = 'left' | 'right' | 'up' | 'down';

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
  /** "delete it": remove the visible selection, never the whole layer. */
  | { kind: 'delete-selection' }
  /** "duplicate it": copy the visible selection and select the copy. */
  | { kind: 'duplicate-selection' }
  /** Move the visible selection by a predictable step, or center it on the canvas. */
  | { kind: 'move-selection'; direction: 'left' | 'right' | 'up' | 'down' | 'center' }
  /** “Move it” needs a direction before anything changes. */
  | { kind: 'clarify-selection-move' }
  /** Place the visible selection flush with a named canvas edge. */
  | { kind: 'place-selection'; edge: 'left' | 'right' | 'top' | 'bottom' }
  /** Repeat only the immediately preceding successful directional nudge. */
  | { kind: 'repeat-selection-move' }
  | { kind: 'tool'; tool: ToolId }
  /** "mirror on" / "mirror off": toggle vertical mirror symmetry. */
  | { kind: 'mirror'; on: boolean }
  | { kind: 'color'; color: Color; name: string; selection?: true }
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
  selectionDeletePhrases: string[];
  selectionDuplicatePhrases: string[];
  selectionMovePhrases: Record<'left' | 'right' | 'up' | 'down' | 'center', string[]>;
  selectionMoveClarifyPhrases: string[];
  selectionDirectionAnswers: Record<SelectionDirection, string[]>;
  selectionPlacePhrases: Record<'left' | 'right' | 'top' | 'bottom', string[]>;
  selectionRepeatPhrases: string[];
  selectionReferences: string[];
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
  selectionDeletePhrases: [
    'delete it',
    'delete that',
    'remove it',
    'remove that',
    'erase it',
    'erase that',
  ],
  selectionDuplicatePhrases: [
    'duplicate it',
    'duplicate that',
    'copy it',
    'copy that',
    'make another one',
  ],
  selectionMovePhrases: {
    left: ['move it left', 'move that left', 'move selection left'],
    right: ['move it right', 'move that right', 'move selection right'],
    up: ['move it up', 'move that up', 'move selection up'],
    down: ['move it down', 'move that down', 'move selection down'],
    center: [
      'center it',
      'centre it',
      'center that',
      'centre that',
      'center selection',
      'centre selection',
      'put it in the center',
      'put it in the centre',
    ],
  },
  selectionMoveClarifyPhrases: ['move it', 'move that', 'move this', 'move selection'],
  selectionDirectionAnswers: {
    left: ['left', 'to the left'],
    right: ['right', 'to the right'],
    up: ['up', 'upward'],
    down: ['down', 'downward'],
  },
  selectionPlacePhrases: {
    left: ['put it on the left', 'put that on the left', 'move it to the left edge'],
    right: ['put it on the right', 'put that on the right', 'move it to the right edge'],
    top: ['put it at the top', 'put that at the top', 'move it to the top edge'],
    bottom: ['put it at the bottom', 'put that at the bottom', 'move it to the bottom edge'],
  },
  selectionRepeatPhrases: ['again', 'a little more', 'move it again', 'one more step'],
  selectionReferences: ['it', 'that', 'this', 'selection', 'selected', 'object'],
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
  selectionDeletePhrases: ['احذف هذا', 'احذفها', 'امسح هذا', 'احذف التحديد'],
  selectionDuplicatePhrases: ['كرر هذا', 'كررها', 'انسخ هذا', 'انسخ التحديد'],
  selectionMovePhrases: {
    left: ['حرك هذا لليسار', 'حرك هذا الي اليسار', 'حرك التحديد لليسار'],
    right: ['حرك هذا لليمين', 'حرك هذا الي اليمين', 'حرك التحديد لليمين'],
    up: ['حرك هذا للاعلى', 'حرك هذا الي الاعلى', 'حرك التحديد للاعلى'],
    down: ['حرك هذا للاسفل', 'حرك هذا الي الاسفل', 'حرك التحديد للاسفل'],
    center: ['ضع هذا في المنتصف', 'وسط هذا', 'وسط التحديد'],
  },
  selectionMoveClarifyPhrases: ['حرك هذا', 'حركها', 'حرك التحديد'],
  selectionDirectionAnswers: {
    left: ['يسار', 'اليسار'],
    right: ['يمين', 'اليمين'],
    up: ['فوق', 'اعلى', 'الاعلى'],
    down: ['تحت', 'اسفل', 'الاسفل'],
  },
  selectionPlacePhrases: {
    left: ['ضع هذا عند الحافة اليسرى', 'ضع هذا علي اليسار'],
    right: ['ضع هذا عند الحافة اليمنى', 'ضع هذا علي اليمين'],
    top: ['ضع هذا عند الحافة العلوية', 'ضع هذا في الاعلي'],
    bottom: ['ضع هذا عند الحافة السفلية', 'ضع هذا في الاسفل'],
  },
  selectionRepeatPhrases: ['مرة اخري', 'حركه مرة اخري', 'قليلا بعد'],
  selectionReferences: ['هذا', 'هذه', 'التحديد', 'المحدد'],
  storyboardPhrases: [
    'اصنع قصة عن',
    'اصنع لي قصة عن',
    'اصنع قصة',
    'اصنع لي قصة',
    'اصنع رسوما متحركة عن',
    'حول قصتي الى رسوم',
  ],
};

/** Persian additions (فارسی), merged into English like the Arabic table. */
const FA_VOCAB: VoiceVocabulary = {
  filler: new Set([
    'لطفا',
    'لطفاً',
    'میشه',
    'میشود',
    'می',
    'شه',
    'شود',
    'خواهش',
    'میکنم',
    'کنم',
    'الان',
    'برام',
    'برای',
    'من',
    'رو',
    'را',
  ]),
  colors: {
    قرمز: COLOR_WORDS.red,
    نارنجی: COLOR_WORDS.orange,
    زرد: COLOR_WORDS.yellow,
    سبز: COLOR_WORDS.green,
    فیروزه‌ای: COLOR_WORDS.teal,
    فیروزه: COLOR_WORDS.teal,
    آسمانی: COLOR_WORDS.sky,
    آبی: COLOR_WORDS.blue,
    بنفش: COLOR_WORDS.purple,
    صورتی: COLOR_WORDS.pink,
    قهوه‌ای: COLOR_WORDS.brown,
    قهوه: COLOR_WORDS.brown,
    مشکی: COLOR_WORDS.black,
    سیاه: COLOR_WORDS.black,
    سفید: COLOR_WORDS.white,
    خاکستری: COLOR_WORDS.gray,
    طلایی: COLOR_WORDS.gold,
  },
  tools: {
    قلم: 'brush',
    قلمو: 'brush',
    برس: 'brush',
    مداد: 'pencil',
    پاک‌کن: 'eraser',
    پاکن: 'eraser',
    اسپری: 'spray',
    خط: 'line',
    مستطیل: 'rectangle',
    مربع: 'rectangle',
    بیضی: 'ellipse',
    دایره: 'ellipse',
    سطل: 'fill',
    پرکن: 'fill',
    عصا: 'wand',
    جادو: 'wand',
    لاسو: 'lasso',
    مهر: 'stamp',
    برچسب: 'stamp',
    قطره‌چکان: 'eyedropper',
    قطره: 'eyedropper',
    متن: 'text',
    نوشته: 'text',
  },
  yes: new Set(['بله', 'آره', 'اره', 'حتما', 'حتماً', 'باشه', 'تایید']),
  no: new Set(['نه', 'خیر', 'لغو', 'بیخیال']),
  bigger: new Set(['بزرگتر', 'بزرگ‌تر', 'ضخیمتر', 'ضخیم‌تر', 'بزرگ']),
  smaller: new Set(['کوچکتر', 'کوچک‌تر', 'نازکتر', 'نازک‌تر', 'کوچک']),
  clear: new Set(['پاک', 'تمیز']),
  play: new Set(['پخش', 'اجرا', 'حرکت']),
  stop: new Set(['توقف', 'بایست', 'نگه‌دار', 'مکث']),
  undo: new Set(['واگرد', 'برگرد', 'برگشت']),
  redo: new Set(['بازانجام', 'دوباره']),
  help: new Set(['راهنما', 'کمک', 'دستورها']),
  save: new Set(['ذخیره', 'سیو']),
  game: new Set(['بازی', 'بازیم']),
  templates: {
    catch: new Set(['گرفتن', 'بگیر', 'شکار']),
    flappy: new Set(['پرواز', 'پرنده', 'فلپی']),
    maze: new Set(['هزارتو', 'ماز']),
    platformer: new Set(['سکوبازی', 'پرش', 'جامپر']),
  },
  app: new Set(['اپ', 'برنامه', 'نمونه']),
  appPreview: new Set(['پیش‌نمایش', 'پیشنمایش', 'پیش', 'نمایش', 'امتحان', 'باز', 'نشان']),
  appExport: new Set(['خروجی', 'دانلود', 'اشتراک', 'بفرست']),
  code: new Set(['کد', 'اچ‌تی‌ام‌ال', 'html']),
  mirror: new Set(['آینه', 'قرینه', 'تقارن']),
  clearPhrases: ['همه را پاک کن', 'همه رو پاک کن', 'از اول شروع کن', 'بوم را پاک کن'],
  newFramePhrases: ['فریم جدید', 'فریم اضافه کن', 'یک فریم دیگر', 'فریم بعدی'],
  mirrorOnPhrases: ['آینه روشن', 'تقارن روشن', 'قرینه کن', 'آینه را روشن کن'],
  mirrorOffPhrases: ['آینه خاموش', 'تقارن خاموش', 'قرینه را بردار', 'آینه را خاموش کن'],
  codePhrases: ['کد واقعی', 'خروجی کد', 'به کد تبدیل کن', 'واقعیش کن'],
  narrationRecordPhrases: ['ضبط روایت', 'صدام را ضبط کن', 'صدام رو ضبط کن', 'داستان را ضبط کن'],
  narrationStopPhrases: ['ضبط را متوقف کن', 'ضبط رو متوقف کن', 'پایان ضبط'],
  narrationDeletePhrases: ['روایت را پاک کن', 'صدا را پاک کن', 'ضبط را حذف کن'],
  selectionDeletePhrases: ['این را حذف کن', 'این رو حذف کن', 'انتخاب را حذف کن'],
  selectionDuplicatePhrases: ['این را کپی کن', 'این رو کپی کن', 'انتخاب را کپی کن', 'تکرارش کن'],
  selectionMovePhrases: {
    left: ['این را به چپ ببر', 'این رو به چپ ببر', 'انتخاب را به چپ ببر'],
    right: ['این را به راست ببر', 'این رو به راست ببر', 'انتخاب را به راست ببر'],
    up: ['این را بالا ببر', 'این رو بالا ببر', 'انتخاب را بالا ببر'],
    down: ['این را پایین ببر', 'این رو پایین ببر', 'انتخاب را پایین ببر'],
    center: ['این را وسط بگذار', 'این رو وسط بگذار', 'انتخاب را وسط بگذار'],
  },
  selectionMoveClarifyPhrases: ['این را حرکت بده', 'این رو حرکت بده', 'انتخاب را حرکت بده'],
  selectionDirectionAnswers: {
    left: ['چپ', 'به چپ'],
    right: ['راست', 'به راست'],
    up: ['بالا', 'به بالا'],
    down: ['پایین', 'به پایین'],
  },
  selectionPlacePhrases: {
    left: ['این را کنار چپ بگذار', 'این را در لبه چپ بگذار'],
    right: ['این را کنار راست بگذار', 'این را در لبه راست بگذار'],
    top: ['این را بالای بوم بگذار', 'این را در لبه بالا بگذار'],
    bottom: ['این را پایین بوم بگذار', 'این را در لبه پایین بگذار'],
  },
  selectionRepeatPhrases: ['دوباره', 'یک کم بیشتر', 'یه کم بیشتر'],
  selectionReferences: ['این', 'انتخاب', 'انتخاب شده'],
  storyboardPhrases: [
    'یک داستان درباره',
    'داستانی درباره',
    'داستان بساز',
    'یک انیمیشن درباره',
    'انیمیشن بساز',
  ],
};

/** Simplified Chinese additions (简体中文), merged into the English base. */
const ZH_VOCAB: VoiceVocabulary = {
  filler: new Set([
    '请',
    '请你',
    '麻烦',
    '帮我',
    '一下',
    '现在',
    '梦梦',
    '我要',
    '我想',
    '使用',
    '选择',
  ]),
  colors: {
    红色: COLOR_WORDS.red,
    橙色: COLOR_WORDS.orange,
    黄色: COLOR_WORDS.yellow,
    绿色: COLOR_WORDS.green,
    青绿色: COLOR_WORDS.teal,
    天蓝色: COLOR_WORDS.sky,
    蓝色: COLOR_WORDS.blue,
    紫色: COLOR_WORDS.purple,
    粉色: COLOR_WORDS.pink,
    棕色: COLOR_WORDS.brown,
    黑色: COLOR_WORDS.black,
    白色: COLOR_WORDS.white,
    灰色: COLOR_WORDS.gray,
    金色: COLOR_WORDS.gold,
  },
  tools: {
    画笔: 'brush',
    铅笔: 'pencil',
    橡皮擦: 'eraser',
    喷枪: 'spray',
    直线: 'line',
    矩形: 'rectangle',
    正方形: 'rectangle',
    椭圆: 'ellipse',
    圆形: 'ellipse',
    填充: 'fill',
    油漆桶: 'fill',
    魔棒: 'wand',
    套索: 'lasso',
    印章: 'stamp',
    吸管: 'eyedropper',
    文字: 'text',
  },
  yes: new Set(['是', '是的', '好的', '好', '确认', '确定']),
  no: new Set(['不', '不要', '取消', '算了']),
  bigger: new Set(['变大', '大一点', '加粗', '更粗']),
  smaller: new Set(['变小', '小一点', '变细', '更细']),
  clear: new Set(['清空', '清除']),
  play: new Set(['播放', '开始动画', '玩']),
  stop: new Set(['停止', '暂停']),
  undo: new Set(['撤销', '退回']),
  redo: new Set(['重做', '恢复']),
  help: new Set(['帮助', '语音命令']),
  save: new Set(['保存']),
  game: new Set(['游戏', '我的游戏']),
  templates: {
    catch: new Set(['接物', '接东西']),
    flappy: new Set(['飞行', '小鸟']),
    maze: new Set(['迷宫']),
    platformer: new Set(['平台跳跃', '跳跃者']),
  },
  app: new Set(['应用', '原型']),
  appPreview: new Set(['预览', '试用', '打开', '看看']),
  appExport: new Set(['导出', '下载', '分享']),
  code: new Set(['代码', 'html']),
  mirror: new Set(['镜像', '对称']),
  clearPhrases: ['全部清空', '清空画布', '重新开始'],
  newFramePhrases: ['新建帧', '添加帧', '下一帧', '再加一帧'],
  mirrorOnPhrases: ['打开镜像', '开启镜像', '打开对称', '开启对称'],
  mirrorOffPhrases: ['关闭镜像', '关掉镜像', '关闭对称', '关掉对称'],
  codePhrases: ['导出代码', '生成代码', '变成代码', '生成真实代码'],
  narrationRecordPhrases: ['录制旁白', '录制我的声音', '开始录音', '讲述故事'],
  narrationStopPhrases: ['停止录音', '结束录音', '录音完成'],
  narrationDeletePhrases: ['删除旁白', '删除录音', '清除旁白'],
  selectionDeletePhrases: ['删除它', '删除这个', '删除选中内容'],
  selectionDuplicatePhrases: ['复制它', '复制这个', '复制选中内容'],
  selectionMovePhrases: {
    left: ['把这个向左移动', '把它移到左边', '选中内容向左移动'],
    right: ['把这个向右移动', '把它移到右边', '选中内容向右移动'],
    up: ['把这个向上移动', '把它移到上面', '选中内容向上移动'],
    down: ['把这个向下移动', '把它移到下面', '选中内容向下移动'],
    center: ['把这个放到中间', '把它放到中间', '选中内容居中'],
  },
  selectionMoveClarifyPhrases: ['移动它', '移动这个', '移动选中内容'],
  selectionDirectionAnswers: {
    left: ['左', '左边', '向左'],
    right: ['右', '右边', '向右'],
    up: ['上', '上面', '向上'],
    down: ['下', '下面', '向下'],
  },
  selectionPlacePhrases: {
    left: ['把这个放到左边', '把它移到画布左边'],
    right: ['把这个放到右边', '把它移到画布右边'],
    top: ['把这个放到顶部', '把它移到画布顶部'],
    bottom: ['把这个放到底部', '把它移到画布底部'],
  },
  selectionRepeatPhrases: ['再来一次', '再移动一点', '再一点'],
  selectionReferences: ['它', '这个', '选中内容'],
  storyboardPhrases: ['制作一个故事', '制作故事', '创作一个故事', '制作一个动画', '制作动画'],
};

/** Brazilian Portuguese additions, merged into the English base. */
const PT_VOCAB: VoiceVocabulary = {
  filler: new Set([
    'por',
    'favor',
    'pode',
    'você',
    'voce',
    'agora',
    'dream',
    'quero',
    'eu',
    'meu',
    'minha',
    'para',
    'com',
    'use',
    'escolha',
  ]),
  colors: {
    vermelho: COLOR_WORDS.red,
    laranja: COLOR_WORDS.orange,
    amarelo: COLOR_WORDS.yellow,
    verde: COLOR_WORDS.green,
    turquesa: COLOR_WORDS.teal,
    celeste: COLOR_WORDS.sky,
    azul: COLOR_WORDS.blue,
    roxo: COLOR_WORDS.purple,
    violeta: COLOR_WORDS.violet,
    rosa: COLOR_WORDS.pink,
    marrom: COLOR_WORDS.brown,
    preto: COLOR_WORDS.black,
    branco: COLOR_WORDS.white,
    cinza: COLOR_WORDS.gray,
    ciano: COLOR_WORDS.cyan,
    magenta: COLOR_WORDS.magenta,
    dourado: COLOR_WORDS.gold,
  },
  tools: {
    pincel: 'brush',
    lápis: 'pencil',
    lapis: 'pencil',
    borracha: 'eraser',
    spray: 'spray',
    aerógrafo: 'spray',
    linha: 'line',
    retângulo: 'rectangle',
    retangulo: 'rectangle',
    quadrado: 'rectangle',
    elipse: 'ellipse',
    círculo: 'ellipse',
    circulo: 'ellipse',
    preencher: 'fill',
    balde: 'fill',
    varinha: 'wand',
    laço: 'lasso',
    laco: 'lasso',
    carimbo: 'stamp',
    'conta-gotas': 'eyedropper',
    conta: 'eyedropper',
    texto: 'text',
  },
  yes: new Set(['sim', 'claro', 'confirmar', 'confirmo', 'certo']),
  no: new Set(['não', 'nao', 'cancelar', 'cancela', 'deixa']),
  bigger: new Set(['maior', 'aumentar', 'aumenta', 'grosso', 'grossa']),
  smaller: new Set(['menor', 'diminuir', 'diminui', 'fino', 'fina']),
  clear: new Set(['limpar', 'limpe']),
  play: new Set(['tocar', 'reproduzir', 'animar', 'jogar']),
  stop: new Set(['parar', 'pare', 'pausar', 'pause']),
  undo: new Set(['desfazer', 'desfaça', 'desfaca', 'voltar']),
  redo: new Set(['refazer', 'refaça', 'refaca']),
  help: new Set(['ajuda', 'comandos', 'opções', 'opcoes']),
  save: new Set(['salvar', 'salve', 'guardar']),
  game: new Set(['jogo', 'jogos']),
  templates: {
    catch: new Set(['pega', 'pegar', 'capturar']),
    flappy: new Set(['flappy', 'voar', 'voando', 'pássaro', 'passaro']),
    maze: new Set(['labirinto']),
    platformer: new Set(['plataforma', 'plataformas', 'pular', 'saltador']),
  },
  app: new Set(['app', 'aplicativo', 'protótipo', 'prototipo']),
  appPreview: new Set([
    'pré-visualizar',
    'pre-visualizar',
    'visualizar',
    'testar',
    'abrir',
    'mostrar',
  ]),
  appExport: new Set(['exportar', 'baixar', 'compartilhar', 'enviar']),
  code: new Set(['código', 'codigo', 'html']),
  mirror: new Set(['espelho', 'espelhamento', 'simetria']),
  clearPhrases: ['limpar tudo', 'apagar tudo', 'começar de novo', 'limpar a tela'],
  newFramePhrases: ['novo quadro', 'adicionar quadro', 'outro quadro', 'próximo quadro'],
  mirrorOnPhrases: ['ligar espelhamento', 'espelhamento ligado', 'ligar simetria'],
  mirrorOffPhrases: ['desligar espelhamento', 'espelhamento desligado', 'desligar simetria'],
  codePhrases: [
    'código real',
    'codigo real',
    'exportar código',
    'exportar codigo',
    'transformar em código',
  ],
  narrationRecordPhrases: [
    'gravar narração',
    'gravar minha voz',
    'começar a gravar',
    'narrar a história',
  ],
  narrationStopPhrases: ['parar gravação', 'parar de gravar', 'terminar gravação'],
  narrationDeletePhrases: [
    'excluir narração',
    'apagar narração',
    'excluir gravação',
    'apagar minha voz',
  ],
  selectionDeletePhrases: ['excluir isso', 'apagar isso', 'remover isso', 'excluir seleção'],
  selectionDuplicatePhrases: ['duplicar isso', 'copiar isso', 'duplicar seleção'],
  selectionMovePhrases: {
    left: ['mova isso para a esquerda', 'mover seleção para a esquerda'],
    right: ['mova isso para a direita', 'mover seleção para a direita'],
    up: ['mova isso para cima', 'mover seleção para cima'],
    down: ['mova isso para baixo', 'mover seleção para baixo'],
    center: ['centralize isso', 'coloque isso no centro', 'centralizar seleção'],
  },
  selectionMoveClarifyPhrases: ['mova isso', 'mover isso', 'mover seleção'],
  selectionDirectionAnswers: {
    left: ['esquerda', 'para a esquerda'],
    right: ['direita', 'para a direita'],
    up: ['cima', 'para cima'],
    down: ['baixo', 'para baixo'],
  },
  selectionPlacePhrases: {
    left: ['coloque isso na borda esquerda', 'coloque isso à esquerda'],
    right: ['coloque isso na borda direita', 'coloque isso à direita'],
    top: ['coloque isso no topo', 'coloque isso na borda superior'],
    bottom: ['coloque isso embaixo', 'coloque isso na borda inferior'],
  },
  selectionRepeatPhrases: ['de novo', 'mais um pouco', 'mova de novo'],
  selectionReferences: ['isso', 'isto', 'seleção', 'selecionado'],
  storyboardPhrases: [
    'crie uma história sobre',
    'criar uma história sobre',
    'faça uma história sobre',
    'crie uma história',
    'criar uma história',
    'crie uma animação sobre',
    'criar uma animação sobre',
    'faça uma animação',
  ],
};

/** Russian additions, merged into the English base. */
const RU_VOCAB: VoiceVocabulary = {
  filler: new Set([
    'пожалуйста',
    'можешь',
    'можете',
    'сейчас',
    'dream',
    'хочу',
    'я',
    'мне',
    'мой',
    'моя',
    'моё',
    'мое',
    'выбери',
    'выбрать',
    'используй',
  ]),
  colors: {
    красный: COLOR_WORDS.red,
    красным: COLOR_WORDS.red,
    оранжевый: COLOR_WORDS.orange,
    оранжевым: COLOR_WORDS.orange,
    жёлтый: COLOR_WORDS.yellow,
    жёлтым: COLOR_WORDS.yellow,
    желтый: COLOR_WORDS.yellow,
    желтым: COLOR_WORDS.yellow,
    зелёный: COLOR_WORDS.green,
    зелёным: COLOR_WORDS.green,
    зеленый: COLOR_WORDS.green,
    зеленым: COLOR_WORDS.green,
    бирюзовый: COLOR_WORDS.teal,
    бирюзовым: COLOR_WORDS.teal,
    голубой: COLOR_WORDS.sky,
    голубым: COLOR_WORDS.sky,
    синий: COLOR_WORDS.blue,
    синим: COLOR_WORDS.blue,
    фиолетовый: COLOR_WORDS.purple,
    фиолетовым: COLOR_WORDS.purple,
    розовый: COLOR_WORDS.pink,
    розовым: COLOR_WORDS.pink,
    коричневый: COLOR_WORDS.brown,
    коричневым: COLOR_WORDS.brown,
    чёрный: COLOR_WORDS.black,
    чёрным: COLOR_WORDS.black,
    черный: COLOR_WORDS.black,
    черным: COLOR_WORDS.black,
    белый: COLOR_WORDS.white,
    белым: COLOR_WORDS.white,
    серый: COLOR_WORDS.gray,
    серым: COLOR_WORDS.gray,
    циан: COLOR_WORDS.cyan,
    пурпурный: COLOR_WORDS.magenta,
    золотой: COLOR_WORDS.gold,
    золотым: COLOR_WORDS.gold,
  },
  tools: {
    кисть: 'brush',
    карандаш: 'pencil',
    ластик: 'eraser',
    распылитель: 'spray',
    аэрограф: 'spray',
    линия: 'line',
    прямоугольник: 'rectangle',
    квадрат: 'rectangle',
    эллипс: 'ellipse',
    круг: 'ellipse',
    заливка: 'fill',
    ведро: 'fill',
    палочка: 'wand',
    лассо: 'lasso',
    штамп: 'stamp',
    наклейка: 'stamp',
    пипетка: 'eyedropper',
    текст: 'text',
  },
  yes: new Set(['да', 'подтверждаю', 'хорошо', 'точно']),
  no: new Set(['нет', 'отмена', 'отмени', 'не надо']),
  bigger: new Set(['больше', 'увеличить', 'увеличь', 'толще']),
  smaller: new Set(['меньше', 'уменьшить', 'уменьши', 'тоньше']),
  clear: new Set(['очистить', 'очисти']),
  play: new Set(['воспроизвести', 'запустить', 'анимировать', 'играть', 'сыграть']),
  stop: new Set(['остановить', 'останови', 'стоп', 'пауза']),
  undo: new Set(['отменить', 'вернуть', 'назад']),
  redo: new Set(['повторить', 'повтори']),
  help: new Set(['помощь', 'команды', 'справка']),
  save: new Set(['сохранить', 'сохрани']),
  game: new Set(['игра', 'игру', 'игры']),
  templates: {
    catch: new Set(['поймай', 'ловля', 'ловить']),
    flappy: new Set(['флаппи', 'полёт', 'полет', 'летать', 'птица']),
    maze: new Set(['лабиринт']),
    platformer: new Set(['платформер', 'платформы', 'прыжки']),
  },
  app: new Set(['приложение', 'приложения', 'прототип']),
  appPreview: new Set(['просмотр', 'проверить', 'открыть', 'показать']),
  appExport: new Set(['экспортировать', 'экспорт', 'скачать', 'поделиться', 'отправить']),
  code: new Set(['код', 'html']),
  mirror: new Set(['зеркало', 'отражение', 'симметрия']),
  clearPhrases: ['очистить всё', 'стереть всё', 'начать заново', 'очистить холст'],
  newFramePhrases: ['новый кадр', 'добавить кадр', 'ещё кадр', 'следующий кадр'],
  mirrorOnPhrases: ['включить отражение', 'включить зеркало', 'включить симметрию'],
  mirrorOffPhrases: ['выключить отражение', 'выключить зеркало', 'выключить симметрию'],
  codePhrases: ['настоящий код', 'экспортировать код', 'экспорт кода', 'превратить в код'],
  narrationRecordPhrases: [
    'записать озвучку',
    'записать мой голос',
    'начать запись',
    'рассказать историю',
  ],
  narrationStopPhrases: ['остановить запись', 'закончить запись', 'завершить запись'],
  narrationDeletePhrases: [
    'удалить озвучку',
    'удалить запись',
    'стереть озвучку',
    'стереть мой голос',
  ],
  selectionDeletePhrases: ['удалить это', 'удали это', 'удалить выделенное'],
  selectionDuplicatePhrases: ['дублировать это', 'скопируй это', 'дублировать выделенное'],
  selectionMovePhrases: {
    left: ['перемести это влево', 'сдвинь это влево', 'перемести выделенное влево'],
    right: ['перемести это вправо', 'сдвинь это вправо', 'перемести выделенное вправо'],
    up: ['перемести это вверх', 'сдвинь это вверх', 'перемести выделенное вверх'],
    down: ['перемести это вниз', 'сдвинь это вниз', 'перемести выделенное вниз'],
    center: ['помести это в центр', 'выровняй это по центру', 'выделенное по центру'],
  },
  selectionMoveClarifyPhrases: ['перемести это', 'сдвинь это', 'перемести выделенное'],
  selectionDirectionAnswers: {
    left: ['влево', 'налево', 'лево'],
    right: ['вправо', 'направо', 'право'],
    up: ['вверх', 'наверх'],
    down: ['вниз'],
  },
  selectionPlacePhrases: {
    left: ['помести это у левого края', 'поставь это слева'],
    right: ['помести это у правого края', 'поставь это справа'],
    top: ['помести это у верхнего края', 'поставь это сверху'],
    bottom: ['помести это у нижнего края', 'поставь это снизу'],
  },
  selectionRepeatPhrases: ['ещё раз', 'еще раз', 'ещё немного', 'еще немного'],
  selectionReferences: ['это', 'выделение', 'выделенное'],
  storyboardPhrases: [
    'создай историю о',
    'создать историю о',
    'сделай историю о',
    'создай историю',
    'создать историю',
    'создай анимацию о',
    'создать анимацию о',
    'сделай анимацию',
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
    selectionDeletePhrases: [...base.selectionDeletePhrases, ...extra.selectionDeletePhrases],
    selectionDuplicatePhrases: [
      ...base.selectionDuplicatePhrases,
      ...extra.selectionDuplicatePhrases,
    ],
    selectionMovePhrases: {
      left: [...base.selectionMovePhrases.left, ...extra.selectionMovePhrases.left],
      right: [...base.selectionMovePhrases.right, ...extra.selectionMovePhrases.right],
      up: [...base.selectionMovePhrases.up, ...extra.selectionMovePhrases.up],
      down: [...base.selectionMovePhrases.down, ...extra.selectionMovePhrases.down],
      center: [...base.selectionMovePhrases.center, ...extra.selectionMovePhrases.center],
    },
    selectionMoveClarifyPhrases: [
      ...base.selectionMoveClarifyPhrases,
      ...extra.selectionMoveClarifyPhrases,
    ],
    selectionDirectionAnswers: {
      left: [...base.selectionDirectionAnswers.left, ...extra.selectionDirectionAnswers.left],
      right: [...base.selectionDirectionAnswers.right, ...extra.selectionDirectionAnswers.right],
      up: [...base.selectionDirectionAnswers.up, ...extra.selectionDirectionAnswers.up],
      down: [...base.selectionDirectionAnswers.down, ...extra.selectionDirectionAnswers.down],
    },
    selectionPlacePhrases: {
      left: [...base.selectionPlacePhrases.left, ...extra.selectionPlacePhrases.left],
      right: [...base.selectionPlacePhrases.right, ...extra.selectionPlacePhrases.right],
      top: [...base.selectionPlacePhrases.top, ...extra.selectionPlacePhrases.top],
      bottom: [...base.selectionPlacePhrases.bottom, ...extra.selectionPlacePhrases.bottom],
    },
    selectionRepeatPhrases: [...base.selectionRepeatPhrases, ...extra.selectionRepeatPhrases],
    selectionReferences: [...base.selectionReferences, ...extra.selectionReferences],
    storyboardPhrases: [...base.storyboardPhrases, ...extra.storyboardPhrases],
  };
}

const LOCALE_VOCABULARIES: Record<string, VoiceVocabulary> = {
  ar: mergeVocabulary(EN_VOCAB, AR_VOCAB),
  fa: mergeVocabulary(EN_VOCAB, FA_VOCAB),
  zh: mergeVocabulary(EN_VOCAB, ZH_VOCAB),
  pt: mergeVocabulary(EN_VOCAB, PT_VOCAB),
  ru: mergeVocabulary(EN_VOCAB, RU_VOCAB),
};

function vocabularyTerms(vocab: VoiceVocabulary): string[] {
  return [
    ...Object.keys(vocab.colors),
    ...Object.keys(vocab.tools),
    ...vocab.yes,
    ...vocab.no,
    ...vocab.bigger,
    ...vocab.smaller,
    ...vocab.clear,
    ...vocab.play,
    ...vocab.stop,
    ...vocab.undo,
    ...vocab.redo,
    ...vocab.help,
    ...vocab.save,
    ...vocab.game,
    ...Object.values(vocab.templates).flatMap((words) => [...words]),
    ...vocab.app,
    ...vocab.appPreview,
    ...vocab.appExport,
    ...vocab.code,
    ...vocab.mirror,
  ];
}

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

/** Persian speech engines sometimes return Arabic yeh/kaf; unify them. */
export function normalizePersian(text: string): string {
  return text
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإٱ]/g, 'ا')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک');
}

/** Tokenize: lowercase, normalize Arabic, drop punctuation, remove filler. */
export function tokenize(
  transcript: string,
  filler: Set<string> = FILLER_WORDS,
  locale = 'en',
): string[] {
  return (locale === 'fa' ? normalizePersian(transcript) : normalizeArabic(transcript))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .split(/\s+/)
    .filter((word) => word !== '' && !filler.has(word));
}

/** Remove locale filler while preserving the exact remaining utterance. */
function exactVoicePhrase(transcript: string, filler: Set<string>, locale: string): string {
  if (locale === 'zh') {
    return [...filler]
      .sort((a, b) => b.length - a.length)
      .reduce((text, word) => text.replaceAll(word, ''), normalizeArabic(transcript).toLowerCase())
      .replace(/[^\p{L}\p{N}]+/gu, '');
  }
  return tokenize(transcript, filler, locale).join(' ');
}

function has(tokens: Set<string>, words: Set<string>): boolean {
  for (const token of tokens) {
    if (words.has(token)) return true;
  }
  return false;
}

/** Parse only a one-word directional answer during an active clarification. */
export function parseVoiceDirectionAnswer(
  transcript: string,
  locale = 'en',
): SelectionDirection | null {
  const vocab = vocabularyFor(locale);
  const answer = exactVoicePhrase(transcript, vocab.filler, locale);
  if (!answer) return null;
  for (const direction of ['left', 'right', 'up', 'down'] as const) {
    if (
      vocab.selectionDirectionAnswers[direction].some(
        (phrase) => exactVoicePhrase(phrase, vocab.filler, locale) === answer,
      )
    ) {
      return direction;
    }
  }
  return null;
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

function hasSelectionReference(normalized: string, references: readonly string[]): boolean {
  const padded = ` ${normalized} `;
  return references.some((reference) =>
    /\p{Script=Han}/u.test(reference)
      ? normalized.includes(reference)
      : padded.includes(` ${reference} `),
  );
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
      .replace(
        /^(?:about|where|with|of|عن|حول|فيها|درباره|که|با|关于|讲述|内容是|sobre|com|em que|о|об|про|где|с)\s*/u,
        '',
      )
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
  const normalized = (locale === 'fa' ? normalizePersian(transcript) : normalizeArabic(transcript))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .trim();
  const tokenList = tokenize(transcript, vocab.filler, locale);
  const tokens = new Set(tokenList);
  if (locale === 'zh') {
    for (const term of vocabularyTerms(vocab)) {
      if (/\p{Script=Han}/u.test(term) && normalized.includes(term)) tokens.add(term);
    }
  }
  if (tokens.size === 0) return null;

  // Confirmations win only when every meaningful word is an answer. This keeps
  // “yeah sure” as yes while letting corrections such as “no, undo” continue
  // to the requested command instead of being swallowed as a bare no.
  if (locale === 'zh') {
    const confirmation = [...vocab.filler]
      .sort((a, b) => b.length - a.length)
      .reduce((text, word) => text.replaceAll(word, ''), normalized)
      .replace(/\s+/g, '');
    if (vocab.yes.has(confirmation)) return { kind: 'confirm' };
    if (vocab.no.has(confirmation)) return { kind: 'cancel' };
  } else if (tokenList.length > 0) {
    if (tokenList.every((word) => vocab.yes.has(word))) return { kind: 'confirm' };
    if (tokenList.every((word) => vocab.no.has(word))) return { kind: 'cancel' };
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

  if (hasPhrase(normalized, ...vocab.selectionDeletePhrases)) {
    return { kind: 'delete-selection' };
  }
  if (hasPhrase(normalized, ...vocab.selectionDuplicatePhrases)) {
    return { kind: 'duplicate-selection' };
  }
  for (const direction of ['left', 'right', 'up', 'down', 'center'] as const) {
    if (hasPhrase(normalized, ...vocab.selectionMovePhrases[direction])) {
      return { kind: 'move-selection', direction };
    }
  }
  for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
    if (hasPhrase(normalized, ...vocab.selectionPlacePhrases[edge])) {
      return { kind: 'place-selection', edge };
    }
  }
  const exactSelectionMove = exactVoicePhrase(transcript, vocab.filler, locale);
  if (
    vocab.selectionMoveClarifyPhrases.some(
      (phrase) => exactVoicePhrase(phrase, vocab.filler, locale) === exactSelectionMove,
    )
  ) {
    return { kind: 'clarify-selection-move' };
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
  if (color) {
    return hasSelectionReference(normalized, vocab.selectionReferences)
      ? { kind: 'color', ...color, selection: true }
      : { kind: 'color', ...color };
  }

  // Continuation is intentionally last: any explicit action in the same
  // utterance wins, so “play again” can never become a selection nudge.
  if (hasPhrase(normalized, ...vocab.selectionRepeatPhrases)) {
    return { kind: 'repeat-selection-move' };
  }

  return null;
}
