/**
 * Offline conversational game planning. A short natural-language request is
 * reduced to the existing, well-tested template/cast/settings contract: no
 * network, no model, and no invented runtime rules that Play cannot honor.
 */

import type { GameCast, GameSettings, GameTemplateId, Layer } from '../engine/types';

export interface GamePromptPlan {
  template: GameTemplateId;
  settings: Partial<GameSettings>;
  cast: Partial<GameCast>;
}

type CastRole = keyof GameCast;

const TEMPLATE_TERMS: Record<GameTemplateId, readonly string[]> = {
  catch: [
    'catch',
    'collect',
    'dodge',
    'avoid',
    'falling',
    'basket',
    'التقط',
    'اجمع',
    'تجنب',
    'تفادى',
    'تسقط',
    '接住',
    '收集',
    '躲避',
    '掉落',
  ],
  flappy: [
    'flap',
    'flappy',
    'fly',
    'flies',
    'flying',
    'bird',
    'gate',
    'pipe',
    'يطير',
    'طيران',
    'رفرف',
    'بوابة',
    'بوابات',
    '飞行',
    '拍打',
    '翅膀',
    '管道',
    '闸门',
  ],
  maze: ['maze', 'labyrinth', 'exit', 'explore', 'متاهة', 'مخرج', 'استكشف', '迷宫', '出口', '探索'],
  platformer: [
    'platform',
    'platformer',
    'run and jump',
    'jump over',
    'reach the flag',
    'منصات',
    'اقفز',
    'اركض',
    'العلم',
    '平台',
    '跑跳',
    '跳过',
    '旗帜',
  ],
};

const ROLE_ORDER: Record<GameTemplateId, readonly CastRole[]> = {
  catch: ['hero', 'good', 'bad', 'background'],
  flappy: ['hero', 'obstacle', 'background'],
  maze: ['hero', 'background'],
  platformer: ['hero', 'good', 'obstacle', 'background'],
};

const ROLE_TERMS: Record<CastRole, readonly string[]> = {
  hero: [
    'hero',
    'player',
    'catcher',
    'basket',
    'cat',
    'rocket',
    'bird',
    'بطل',
    'لاعب',
    'قط',
    'صاروخ',
    '主角',
    '玩家',
    '接球者',
    '猫',
    '火箭',
  ],
  good: [
    'good',
    'star',
    'coin',
    'apple',
    'prize',
    'نجمة',
    'عملة',
    'تفاحة',
    'جائزة',
    '星星',
    '金币',
    '苹果',
    '奖励',
  ],
  bad: [
    'bad',
    'rock',
    'bomb',
    'enemy',
    'spike',
    'صخرة',
    'قنبلة',
    'عدو',
    'شوكة',
    '石头',
    '炸弹',
    '敌人',
    '尖刺',
  ],
  obstacle: [
    'obstacle',
    'gate',
    'pipe',
    'cloud',
    'عائق',
    'بوابة',
    'سحابة',
    '障碍',
    '闸门',
    '管道',
    '云朵',
  ],
  background: [
    'background',
    'backdrop',
    'scene',
    'sky',
    'خلفية',
    'مشهد',
    'سماء',
    '背景',
    '场景',
    '天空',
  ],
};

const EASY_TERMS = [
  'easy',
  'gentle',
  'calm',
  'for a kid',
  'سهل',
  'هادئ',
  'للطفل',
  '简单',
  '温和',
  '轻松',
  '给孩子',
];
const HARD_TERMS = [
  'hard',
  'difficult',
  'challenge',
  'intense',
  'صعب',
  'تحدي',
  'سريع جدا',
  '困难',
  '挑战',
  '激烈',
];
const FAST_TERMS = ['fast', 'quick', 'speedy', 'سريع', '快速', '快一点'];
const SLOW_TERMS = ['slow', 'relaxed', 'بطيء', 'بهدوء', '慢速', '缓慢', '慢一点'];
const BUSY_TERMS = ['busy', 'lots', 'many', 'often', 'كثير', 'متكرر', '很多', '频繁'];
const SPARSE_TERMS = ['few', 'rare', 'spaced out', 'قليل', 'متباعد', '少量', '稀少'];

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06edـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(normalize(term)));
}

function chooseTemplate(text: string, fallback: GameTemplateId): GameTemplateId {
  let chosen = fallback;
  let best = 0;
  for (const template of ['catch', 'flappy', 'maze', 'platformer'] as const) {
    const score = TEMPLATE_TERMS[template].filter((term) => text.includes(normalize(term))).length;
    if (score > best) {
      chosen = template;
      best = score;
    }
  }
  return chosen;
}

function settingsFromPrompt(text: string): Partial<GameSettings> {
  const settings: Partial<GameSettings> = {};
  if (includesAny(text, EASY_TERMS)) {
    Object.assign(settings, { fallSpeed: 110, spawnInterval: 1.6, lives: 5 });
  } else if (includesAny(text, HARD_TERMS)) {
    Object.assign(settings, { fallSpeed: 300, spawnInterval: 0.7, lives: 1 });
  }

  if (includesAny(text, FAST_TERMS)) settings.fallSpeed = 280;
  if (includesAny(text, SLOW_TERMS)) settings.fallSpeed = 110;
  if (includesAny(text, BUSY_TERMS)) settings.spawnInterval = 0.7;
  if (includesAny(text, SPARSE_TERMS)) settings.spawnInterval = 1.8;

  const numberWords: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    واحد: 1,
    اثنان: 2,
    ثلاثة: 3,
    اربع: 4,
    خمسة: 5,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
  };
  const livesPattern =
    /(?:\b([1-9])\b|\b(one|two|three|four|five|واحد|اثنان|ثلاثة|اربع|خمسة)\b|([一二三四五]))\s*(?:lives?|shields?|hearts?|حياة|محاولات|دروع|条命|生命|护盾|红心)/u;
  const lives = text.match(livesPattern);
  if (lives) {
    settings.lives = lives[1] ? Number(lives[1]) : numberWords[lives[2] ?? lives[3] ?? ''];
  }
  return settings;
}

function preferredRole(layerName: string): CastRole | undefined {
  return (Object.keys(ROLE_TERMS) as CastRole[]).find((role) =>
    includesAny(layerName, ROLE_TERMS[role]),
  );
}

function castFromPrompt(
  text: string,
  layers: readonly Pick<Layer, 'id' | 'name'>[],
  template: GameTemplateId,
): Partial<GameCast> {
  const supported = ROLE_ORDER[template];
  const mentioned = layers
    .map((layer) => ({ layer, name: normalize(layer.name) }))
    .filter(({ name }) => name.length > 1 && text.includes(name))
    .sort((a, b) => text.indexOf(a.name) - text.indexOf(b.name));
  const cast: Partial<GameCast> = {};

  for (const { layer, name } of mentioned) {
    const semantic = preferredRole(name);
    const preferred = template === 'platformer' && semantic === 'bad' ? 'obstacle' : semantic;
    const role =
      (preferred && supported.includes(preferred) && cast[preferred] === undefined
        ? preferred
        : supported.find((candidate) => cast[candidate] === undefined)) ?? null;
    if (role) cast[role] = layer.id;
  }
  return cast;
}

/** Plan one supported game from a short supported-language request. */
export function planGameFromPrompt(
  prompt: string,
  layers: readonly Pick<Layer, 'id' | 'name'>[],
  fallback: GameTemplateId = 'catch',
): GamePromptPlan | null {
  const text = normalize(prompt);
  if (!text) return null;
  const template = chooseTemplate(text, fallback);
  return {
    template,
    settings: settingsFromPrompt(text),
    cast: castFromPrompt(text, layers, template),
  };
}
