/**
 * Voice/text story → small, confirmable storyboard plan. Planning is local,
 * deterministic and localized; providers only paint the beats the user has
 * reviewed. Nothing in this module touches the DOM or document store.
 */

export const MIN_STORYBOARD_SCENES = 2;
export const MAX_STORYBOARD_SCENES = 6;
export const MAX_STORY_LENGTH = 600;
export const MAX_STORYBOARD_SCENE_LENGTH = 180;

export interface StoryboardScene {
  description: string;
}

export interface StoryboardPlan {
  story: string;
  scenes: StoryboardScene[];
}

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

function splitBeats(story: string): string[] {
  const sentences = story.split(/[\n.!?？。！؟؛;]+/u);
  return sentences.flatMap((sentence) =>
    sentence.split(
      /\s*(?:,\s*(?:and|then)\s+|\band then\b|\bthen\b|\bnext\b|\bfinally\b|\bafter that\b|،?\s*ثم\s+|،?\s*بعد ذلك\s+|،?\s*(?:واخيرا|وأخيرا)\s*|،?\s*بعدش\s+|،?\s*بعد از آن\s+|،?\s*سپس\s+|،?\s*در پایان\s*|，?\s*(?:然后|接着|随后|之后|最后)\s*|,?\s*(?:e então|depois|em seguida|por fim|finalmente)\s+)/giu,
    ),
  );
}

function capScenes(beats: string[]): string[] {
  if (beats.length <= MAX_STORYBOARD_SCENES) return beats;
  const kept = beats.slice(0, MAX_STORYBOARD_SCENES - 1);
  kept.push(beats.slice(MAX_STORYBOARD_SCENES - 1).join('. '));
  return kept;
}

/** Plan two to six visible beats without contacting an AI provider. */
export function planStoryboard(prompt: string, locale = 'en'): StoryboardPlan | null {
  const story = clean(prompt, MAX_STORY_LENGTH);
  if (!story) return null;
  let beats = capScenes(
    splitBeats(story)
      .map((beat) => clean(beat, MAX_STORYBOARD_SCENE_LENGTH))
      .filter(Boolean),
  );
  if (beats.length < MIN_STORYBOARD_SCENES) {
    beats =
      locale === 'ar'
        ? [`البداية: ${story}`, `اللحظة التالية: ${story}`]
        : locale === 'fa'
          ? [`شروع: ${story}`, `لحظه بعد: ${story}`]
          : locale === 'zh'
            ? [`开头：${story}`, `接下来：${story}`]
            : locale === 'pt'
              ? [`O começo: ${story}`, `O próximo momento: ${story}`]
              : [`The beginning: ${story}`, `The next moment: ${story}`];
  }
  return {
    story,
    scenes: beats.map((description) => ({
      description: clean(description, MAX_STORYBOARD_SCENE_LENGTH),
    })),
  };
}

/** Consistent instruction shared by every independently painted frame. */
export function storyboardImagePrompt(
  story: string,
  scene: string,
  index: number,
  total: number,
): string {
  return [
    `Cute children's storybook animation frame ${index + 1} of ${total}.`,
    'Keep recurring characters, clothes and colors visually consistent across all frames.',
    `Full story: ${clean(story, MAX_STORY_LENGTH)}.`,
    `Moment to show now: ${clean(scene, MAX_STORYBOARD_SCENE_LENGTH)}.`,
    'No words, letters, captions, borders or watermarks in the picture.',
  ].join(' ');
}
