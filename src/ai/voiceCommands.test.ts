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

  it('opens a storyboard and keeps the spoken story for confirmation', () => {
    expect(parseVoiceCommand('make a story')).toEqual({ kind: 'storyboard' });
    expect(parseVoiceCommand('make a story about a moon who meets a fox')).toEqual({
      kind: 'storyboard',
      prompt: 'a moon who meets a fox',
    });
    expect(parseVoiceCommand('make an animation with a dancing rocket')).toEqual({
      kind: 'storyboard',
      prompt: 'a dancing rocket',
    });
    expect(parseVoiceCommand('tell the story')).toEqual({ kind: 'record-narration' });
  });

  it('parses the narration commands', () => {
    expect(parseVoiceCommand('record narration')).toEqual({ kind: 'record-narration' });
    expect(parseVoiceCommand('record my voice')).toEqual({ kind: 'record-narration' });
    expect(parseVoiceCommand('tell the story')).toEqual({ kind: 'record-narration' });
    expect(parseVoiceCommand('stop recording')).toEqual({ kind: 'stop-recording' });
    expect(parseVoiceCommand('delete narration')).toEqual({ kind: 'delete-narration' });
    expect(parseVoiceCommand('delete the narration')).toEqual({ kind: 'delete-narration' });
    // The phrases win over the words they contain.
    expect(parseVoiceCommand('stop recording')).not.toEqual({ kind: 'stop' });
    expect(parseVoiceCommand('delete narration')).not.toEqual({ kind: 'clear' });
  });

  it('"play my game" routes to the game; "stop the game" still stops', () => {
    expect(parseVoiceCommand('play my game')).toEqual({ kind: 'play-game' });
    expect(parseVoiceCommand('can you please play the game')).toEqual({ kind: 'play-game' });
    expect(parseVoiceCommand('game')).toEqual({ kind: 'play-game' });
    expect(parseVoiceCommand('stop the game')).toEqual({ kind: 'stop' });
  });

  it('named games pick a template', () => {
    expect(parseVoiceCommand('play flappy')).toEqual({ kind: 'play-game', template: 'flappy' });
    expect(parseVoiceCommand('play maze')).toEqual({ kind: 'play-game', template: 'maze' });
    expect(parseVoiceCommand('play catch')).toEqual({ kind: 'play-game', template: 'catch' });
    expect(parseVoiceCommand('play platformer')).toEqual({
      kind: 'play-game',
      template: 'platformer',
    });
    expect(parseVoiceCommand('let’s play the maze game')).toEqual({
      kind: 'play-game',
      template: 'maze',
    });
    // A bare template word is a command too; a bare "play" stays animation.
    expect(parseVoiceCommand('maze')).toEqual({ kind: 'play-game', template: 'maze' });
    expect(parseVoiceCommand('play')).toEqual({ kind: 'play' });
  });

  it('parses app preview and export phrases', () => {
    expect(parseVoiceCommand('preview my app')).toEqual({ kind: 'preview-app' });
    expect(parseVoiceCommand('can you show the app')).toEqual({ kind: 'preview-app' });
    expect(parseVoiceCommand('try my prototype')).toEqual({ kind: 'preview-app' });
    expect(parseVoiceCommand('export my app')).toEqual({ kind: 'export-app' });
    expect(parseVoiceCommand('download the app please')).toEqual({ kind: 'export-app' });
    // A bare "app" is not a command; "stop the app" still stops.
    expect(parseVoiceCommand('app')).toBeNull();
    expect(parseVoiceCommand('stop the app')).toEqual({ kind: 'stop' });
  });

  it('parses the make-real code export phrases', () => {
    expect(parseVoiceCommand('export real code')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('export code')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('make real')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('can you make it real please')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('download the html')).toEqual({ kind: 'export-code' });
    // A bare "code" is not a command; app phrases stay app phrases.
    expect(parseVoiceCommand('code')).toBeNull();
    expect(parseVoiceCommand('export my app')).toEqual({ kind: 'export-app' });
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

describe('parseVoiceCommand — Arabic vocabulary (locale "ar")', () => {
  it('parses undo/redo/clear with polite filler', () => {
    expect(parseVoiceCommand('تراجع', 'ar')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('يا حلم من فضلك تراجع', 'ar')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('إعادة', 'ar')).toEqual({ kind: 'redo' });
    expect(parseVoiceCommand('امسح', 'ar')).toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('امسح كل شيء', 'ar')).toEqual({ kind: 'clear' });
  });

  it('parses confirmations and cancellations', () => {
    expect(parseVoiceCommand('نعم', 'ar')).toEqual({ kind: 'confirm' });
    expect(parseVoiceCommand('لا', 'ar')).toEqual({ kind: 'cancel' });
  });

  it('parses frames and playback, diacritics optional', () => {
    expect(parseVoiceCommand('إطار جديد', 'ar')).toEqual({ kind: 'new-frame' });
    expect(parseVoiceCommand('شَغِّل', 'ar')).toEqual({ kind: 'play' });
    expect(parseVoiceCommand('أوقف', 'ar')).toEqual({ kind: 'stop' });
  });

  it('opens an Arabic storyboard with the spoken idea intact', () => {
    expect(parseVoiceCommand('اصنع قصة', 'ar')).toEqual({ kind: 'storyboard' });
    expect(parseVoiceCommand('اصنع لي قصة عن قمر يقابل ثعلبا', 'ar')).toEqual({
      kind: 'storyboard',
      prompt: 'قمر يقابل ثعلبا',
    });
  });

  it('"العب لعبتي" routes to the game; "أوقف اللعبة" still stops', () => {
    expect(parseVoiceCommand('العب لعبتي', 'ar')).toEqual({ kind: 'play-game' });
    expect(parseVoiceCommand('أوقف اللعبة', 'ar')).toEqual({ kind: 'stop' });
  });

  it('parses the code export ("صدّر كود حقيقي"), app export stays separate', () => {
    expect(parseVoiceCommand('صدر كود حقيقي', 'ar')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('كود حقيقي', 'ar')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('صدّر الكود', 'ar')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('صدر التطبيق', 'ar')).toEqual({ kind: 'export-app' });
  });

  it('parses the narration commands; «امسح الصوت» is not a clear', () => {
    expect(parseVoiceCommand('سجّل صوتي', 'ar')).toEqual({ kind: 'record-narration' });
    expect(parseVoiceCommand('سجل الصوت', 'ar')).toEqual({ kind: 'record-narration' });
    expect(parseVoiceCommand('أوقف التسجيل', 'ar')).toEqual({ kind: 'stop-recording' });
    expect(parseVoiceCommand('امسح الصوت', 'ar')).toEqual({ kind: 'delete-narration' });
    expect(parseVoiceCommand('احذف التسجيل', 'ar')).toEqual({ kind: 'delete-narration' });
    // The phrases win over the stop/clear words they contain; English works too.
    expect(parseVoiceCommand('أوقف التسجيل', 'ar')).not.toEqual({ kind: 'stop' });
    expect(parseVoiceCommand('امسح الصوت', 'ar')).not.toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('record narration', 'ar')).toEqual({ kind: 'record-narration' });
  });

  it('Arabic game names pick a template; English still works', () => {
    expect(parseVoiceCommand('العب المتاهة', 'ar')).toEqual({
      kind: 'play-game',
      template: 'maze',
    });
    expect(parseVoiceCommand('العب الطيران', 'ar')).toEqual({
      kind: 'play-game',
      template: 'flappy',
    });
    expect(parseVoiceCommand('العب الصيد', 'ar')).toEqual({ kind: 'play-game', template: 'catch' });
    expect(parseVoiceCommand('العب المنصات', 'ar')).toEqual({
      kind: 'play-game',
      template: 'platformer',
    });
    expect(parseVoiceCommand('العب فلابي', 'ar')).toEqual({
      kind: 'play-game',
      template: 'flappy',
    });
    expect(parseVoiceCommand('play maze', 'ar')).toEqual({ kind: 'play-game', template: 'maze' });
  });

  it('parses tools', () => {
    expect(parseVoiceCommand('فرشاة', 'ar')).toEqual({ kind: 'tool', tool: 'brush' });
    expect(parseVoiceCommand('ممحاة', 'ar')).toEqual({ kind: 'tool', tool: 'eraser' });
    expect(parseVoiceCommand('طابع', 'ar')).toEqual({ kind: 'tool', tool: 'stamp' });
    expect(parseVoiceCommand('دائرة', 'ar')).toEqual({ kind: 'tool', tool: 'ellipse' });
  });

  it('parses colors, including "fill red" in one breath', () => {
    expect(parseVoiceCommand('أحمر', 'ar')).toEqual({
      kind: 'color',
      color: COLOR_WORDS.red,
      name: 'احمر',
    });
    expect(parseVoiceCommand('أزرق', 'ar')).toEqual({
      kind: 'color',
      color: COLOR_WORDS.blue,
      name: 'ازرق',
    });
    expect(parseVoiceCommand('أخضر', 'ar')).toEqual({
      kind: 'color',
      color: COLOR_WORDS.green,
      name: 'اخضر',
    });
    expect(parseVoiceCommand('أصفر', 'ar')).toEqual({
      kind: 'color',
      color: COLOR_WORDS.yellow,
      name: 'اصفر',
    });
    expect(parseVoiceCommand('أسود', 'ar')).toEqual({
      kind: 'color',
      color: COLOR_WORDS.black,
      name: 'اسود',
    });
    expect(parseVoiceCommand('أبيض', 'ar')).toEqual({
      kind: 'color',
      color: COLOR_WORDS.white,
      name: 'ابيض',
    });
    expect(parseVoiceCommand('املأ أحمر', 'ar')).toEqual({
      kind: 'fill-color',
      color: COLOR_WORDS.red,
      name: 'احمر',
    });
  });

  it('parses brush size, save and help', () => {
    expect(parseVoiceCommand('أكبر', 'ar')).toEqual({ kind: 'bigger' });
    expect(parseVoiceCommand('أصغر', 'ar')).toEqual({ kind: 'smaller' });
    expect(parseVoiceCommand('احفظ', 'ar')).toEqual({ kind: 'save' });
    expect(parseVoiceCommand('مساعدة', 'ar')).toEqual({ kind: 'help' });
  });

  it('mirror phrases beat the play word inside them', () => {
    expect(parseVoiceCommand('شغّل التناظر', 'ar')).toEqual({ kind: 'mirror', on: true });
    expect(parseVoiceCommand('اطفي التناظر', 'ar')).toEqual({ kind: 'mirror', on: false });
    expect(parseVoiceCommand('مراية', 'ar')).toEqual({ kind: 'mirror', on: true });
  });

  it('English keeps working under the Arabic locale (mixed sentences too)', () => {
    expect(parseVoiceCommand('undo', 'ar')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('brush', 'ar')).toEqual({ kind: 'tool', tool: 'brush' });
    expect(parseVoiceCommand('please تراجع', 'ar')).toEqual({ kind: 'undo' });
  });

  it('unknown Arabic still parses to null', () => {
    expect(parseVoiceCommand('ما حالة الطقس اليوم', 'ar')).toBeNull();
  });
});

describe('parseVoiceCommand — Persian vocabulary (locale "fa")', () => {
  it('parses core creation, recovery and calligraphy-adjacent tools', () => {
    expect(parseVoiceCommand('لطفاً واگرد', 'fa')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('قلم مو', 'fa')).toEqual({ kind: 'tool', tool: 'brush' });
    expect(parseVoiceCommand('پاک کن', 'fa')).toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('فریم جدید', 'fa')).toEqual({ kind: 'new-frame' });
    expect(parseVoiceCommand('ذخیره', 'fa')).toEqual({ kind: 'save' });
  });

  it('parses colors, app delivery and narration without intent collisions', () => {
    expect(parseVoiceCommand('سطل آبی', 'fa')).toEqual({
      kind: 'fill-color',
      color: COLOR_WORDS.blue,
      name: 'آبی',
    });
    expect(parseVoiceCommand('پیش نمایش برنامه', 'fa')).toEqual({ kind: 'preview-app' });
    expect(parseVoiceCommand('خروجی برنامه', 'fa')).toEqual({ kind: 'export-app' });
    expect(parseVoiceCommand('ضبط را حذف کن', 'fa')).toEqual({ kind: 'delete-narration' });
    expect(parseVoiceCommand('ضبط را متوقف کن', 'fa')).toEqual({ kind: 'stop-recording' });
  });

  it('opens a Persian storyboard with the spoken subject intact', () => {
    expect(parseVoiceCommand('یک داستان درباره ماه و روباه', 'fa')).toEqual({
      kind: 'storyboard',
      prompt: 'ماه و روباه',
    });
    expect(parseVoiceCommand('undo', 'fa')).toEqual({ kind: 'undo' });
  });

  it('normalizes Arabic keyboard variants commonly found in Persian text', () => {
    expect(parseVoiceCommand('ذخيره', 'fa')).toEqual({ kind: 'save' });
  });
});

describe('parseVoiceCommand — Simplified Chinese vocabulary (locale "zh")', () => {
  it('parses recovery, confirmation and creation without word spaces', () => {
    expect(parseVoiceCommand('请帮我撤销', 'zh')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('重做', 'zh')).toEqual({ kind: 'redo' });
    expect(parseVoiceCommand('请你清空画布', 'zh')).toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('请确认', 'zh')).toEqual({ kind: 'confirm' });
    expect(parseVoiceCommand('不要', 'zh')).toEqual({ kind: 'cancel' });
    expect(parseVoiceCommand('添加帧', 'zh')).toEqual({ kind: 'new-frame' });
  });

  it('parses tools, colors, sizing and symmetry', () => {
    expect(parseVoiceCommand('请用铅笔', 'zh')).toEqual({ kind: 'tool', tool: 'pencil' });
    expect(parseVoiceCommand('填充红色', 'zh')).toEqual({
      kind: 'fill-color',
      color: COLOR_WORDS.red,
      name: '红色',
    });
    expect(parseVoiceCommand('画笔大一点', 'zh')).toEqual({ kind: 'bigger' });
    expect(parseVoiceCommand('关闭镜像', 'zh')).toEqual({ kind: 'mirror', on: false });
  });

  it('keeps games, apps, code and narration as distinct outcomes', () => {
    expect(parseVoiceCommand('玩迷宫', 'zh')).toEqual({ kind: 'play-game', template: 'maze' });
    expect(parseVoiceCommand('预览我的应用', 'zh')).toEqual({ kind: 'preview-app' });
    expect(parseVoiceCommand('导出应用', 'zh')).toEqual({ kind: 'export-app' });
    expect(parseVoiceCommand('导出真实代码', 'zh')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('录制旁白', 'zh')).toEqual({ kind: 'record-narration' });
    expect(parseVoiceCommand('停止录音', 'zh')).toEqual({ kind: 'stop-recording' });
    expect(parseVoiceCommand('删除旁白', 'zh')).toEqual({ kind: 'delete-narration' });
  });

  it('opens a Chinese storyboard with its subject intact and keeps English available', () => {
    expect(parseVoiceCommand('制作一个故事，关于月亮和狐狸', 'zh')).toEqual({
      kind: 'storyboard',
      prompt: '月亮和狐狸',
    });
    expect(parseVoiceCommand('undo', 'zh')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('今天天气怎么样', 'zh')).toBeNull();
  });
});

describe('parseVoiceCommand — Brazilian Portuguese vocabulary (locale "pt")', () => {
  it('parses recovery, confirmation and creation with polite filler', () => {
    expect(parseVoiceCommand('por favor, desfaça', 'pt')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('refazer', 'pt')).toEqual({ kind: 'redo' });
    expect(parseVoiceCommand('limpar tudo', 'pt')).toEqual({ kind: 'clear' });
    expect(parseVoiceCommand('sim', 'pt')).toEqual({ kind: 'confirm' });
    expect(parseVoiceCommand('não', 'pt')).toEqual({ kind: 'cancel' });
    expect(parseVoiceCommand('adicionar quadro', 'pt')).toEqual({ kind: 'new-frame' });
  });

  it('parses tools, colors, sizing and symmetry', () => {
    expect(parseVoiceCommand('use o lápis', 'pt')).toEqual({ kind: 'tool', tool: 'pencil' });
    expect(parseVoiceCommand('preencher vermelho', 'pt')).toEqual({
      kind: 'fill-color',
      color: COLOR_WORDS.red,
      name: 'vermelho',
    });
    expect(parseVoiceCommand('pincel maior', 'pt')).toEqual({ kind: 'bigger' });
    expect(parseVoiceCommand('desligar espelhamento', 'pt')).toEqual({
      kind: 'mirror',
      on: false,
    });
  });

  it('keeps games, apps, code and narration as distinct outcomes', () => {
    expect(parseVoiceCommand('jogar labirinto', 'pt')).toEqual({
      kind: 'play-game',
      template: 'maze',
    });
    expect(parseVoiceCommand('pré-visualizar meu app', 'pt')).toEqual({ kind: 'preview-app' });
    expect(parseVoiceCommand('exportar meu app', 'pt')).toEqual({ kind: 'export-app' });
    expect(parseVoiceCommand('exportar código real', 'pt')).toEqual({ kind: 'export-code' });
    expect(parseVoiceCommand('gravar narração', 'pt')).toEqual({ kind: 'record-narration' });
    expect(parseVoiceCommand('parar gravação', 'pt')).toEqual({ kind: 'stop-recording' });
    expect(parseVoiceCommand('excluir narração', 'pt')).toEqual({ kind: 'delete-narration' });
  });

  it('opens a Portuguese storyboard with its subject intact and keeps English available', () => {
    expect(parseVoiceCommand('crie uma história sobre a lua e a raposa', 'pt')).toEqual({
      kind: 'storyboard',
      prompt: 'a lua e a raposa',
    });
    expect(parseVoiceCommand('undo', 'pt')).toEqual({ kind: 'undo' });
    expect(parseVoiceCommand('qual é a previsão do tempo', 'pt')).toBeNull();
  });
});
