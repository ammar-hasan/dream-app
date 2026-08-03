import { describe, expect, it } from 'vitest';
import {
  MAX_STORYBOARD_SCENES,
  MAX_STORYBOARD_SCENE_LENGTH,
  planStoryboard,
  storyboardImagePrompt,
} from './storyboard';

describe('planStoryboard', () => {
  it('splits an English story into explicit moments', () => {
    expect(
      planStoryboard('A moon wakes up, and then meets a fox. Finally they dance under stars.'),
    ).toEqual({
      story: 'A moon wakes up, and then meets a fox. Finally they dance under stars.',
      scenes: [
        { description: 'A moon wakes up' },
        { description: 'meets a fox' },
        { description: 'they dance under stars' },
      ],
    });
  });

  it('splits Arabic sequence language without requiring a provider', () => {
    expect(
      planStoryboard('يستيقظ القمر ثم يقابل ثعلبا، ثم يرقصان تحت النجوم', 'ar')?.scenes,
    ).toEqual([
      { description: 'يستيقظ القمر' },
      { description: 'يقابل ثعلبا' },
      { description: 'يرقصان تحت النجوم' },
    ]);
  });

  it('splits Persian sequence language without requiring a provider', () => {
    expect(
      planStoryboard('ماه بیدار می‌شود، سپس روباهی را می‌بیند، بعدش می‌رقصند', 'fa')?.scenes,
    ).toEqual([
      { description: 'ماه بیدار می‌شود' },
      { description: 'روباهی را می‌بیند' },
      { description: 'می‌رقصند' },
    ]);
  });

  it('splits Chinese punctuation and sequence language without requiring a provider', () => {
    expect(planStoryboard('月亮醒来，然后遇见狐狸。最后他们在星空下跳舞', 'zh')?.scenes).toEqual([
      { description: '月亮醒来' },
      { description: '遇见狐狸' },
      { description: '他们在星空下跳舞' },
    ]);
  });

  it('splits Brazilian Portuguese sequence language without requiring a provider', () => {
    expect(
      planStoryboard('A lua acorda, depois encontra uma raposa. Por fim elas dançam', 'pt')?.scenes,
    ).toEqual([
      { description: 'A lua acorda' },
      { description: 'encontra uma raposa' },
      { description: 'elas dançam' },
    ]);
  });

  it('turns one idea into a two-frame beginning and next moment', () => {
    expect(planStoryboard('A sleepy fox under the moon')?.scenes).toEqual([
      { description: 'The beginning: A sleepy fox under the moon' },
      { description: 'The next moment: A sleepy fox under the moon' },
    ]);
    expect(planStoryboard('قطة صغيرة في الحديقة', 'ar')?.scenes).toEqual([
      { description: 'البداية: قطة صغيرة في الحديقة' },
      { description: 'اللحظة التالية: قطة صغيرة في الحديقة' },
    ]);
    expect(planStoryboard('روباهی زیر ماه', 'fa')?.scenes).toEqual([
      { description: 'شروع: روباهی زیر ماه' },
      { description: 'لحظه بعد: روباهی زیر ماه' },
    ]);
    expect(planStoryboard('月光下的小狐狸', 'zh')?.scenes).toEqual([
      { description: '开头：月光下的小狐狸' },
      { description: '接下来：月光下的小狐狸' },
    ]);
    expect(planStoryboard('Uma raposa sob a lua', 'pt')?.scenes).toEqual([
      { description: 'O começo: Uma raposa sob a lua' },
      { description: 'O próximo momento: Uma raposa sob a lua' },
    ]);
  });

  it('caps a long plan and folds the remaining story into its final frame', () => {
    const plan = planStoryboard('One. Two. Three. Four. Five. Six. Seven. Eight.')!;
    expect(plan.scenes).toHaveLength(MAX_STORYBOARD_SCENES);
    expect(plan.scenes.at(-1)?.description).toBe('Six. Seven. Eight');
    expect(
      plan.scenes.every((scene) => scene.description.length <= MAX_STORYBOARD_SCENE_LENGTH),
    ).toBe(true);
  });

  it('rejects an empty story', () => {
    expect(planStoryboard('   ')).toBeNull();
  });
});

describe('storyboardImagePrompt', () => {
  it('keeps the complete story, current beat, continuity and no-text rule', () => {
    const prompt = storyboardImagePrompt('A fox meets a moon', 'They wave hello', 1, 3);
    expect(prompt).toContain('frame 2 of 3');
    expect(prompt).toContain('Full story: A fox meets a moon.');
    expect(prompt).toContain('Moment to show now: They wave hello.');
    expect(prompt).toContain('visually consistent');
    expect(prompt).toContain('No words');
  });
});
