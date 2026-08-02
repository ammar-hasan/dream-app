/**
 * Voice-command executor — the thin layer between the pure parser
 * (`ai/voiceCommands.ts`) and the store. It maps each intent to store
 * actions and returns the friendly message to speak/show. It is written
 * against a minimal store interface so tests can drive it with a fake.
 */

import type { VoiceCommand } from '../ai/voiceCommands';
import type { Color, DreamDocument, ToolId } from '../engine/types';
import type { SymmetryMode } from '../engine/symmetry';
import { t } from './i18n';

/** The slice of the dream store voice commands are allowed to touch. */
export interface VoiceExecutorStore {
  doc: DreamDocument;
  canUndo: boolean;
  canRedo: boolean;
  settings: { size: number };
  /** True when the active layer has anything worth clearing. */
  activeLayerHasContent: boolean;
  undo(): void;
  redo(): void;
  clearLayer(): void;
  toggleAnimation(): void;
  addFrame(): void;
  play(): void;
  pause(): void;
  setTool(tool: ToolId): void;
  setColor(color: Color): void;
  setSize(size: number): void;
  setSymmetry(mode: SymmetryMode): void;
}

export interface VoiceResult {
  /** Feedback to speak (when voices are on) and show in the status bar. */
  message: string;
  /** Set when the command needs a spoken yes/no before it runs. */
  awaitConfirm?: 'clear';
}

const MIN_SIZE = 1;
const MAX_SIZE = 64;

function bigger(size: number): number {
  return Math.min(MAX_SIZE, Math.max(size + 4, Math.round(size * 1.5)));
}

function smaller(size: number): number {
  return Math.max(MIN_SIZE, Math.min(size - 4, Math.round(size / 1.5)));
}

/** Localized color name when the dictionary knows it, else the raw word. */
function colorName(word: string): string {
  const key = `color.${word}`;
  const translated = t(key);
  return translated === key ? word : translated;
}

export function executeVoiceCommand(
  command: VoiceCommand,
  store: VoiceExecutorStore,
  save: () => void,
): VoiceResult | null {
  switch (command.kind) {
    // confirm/cancel are only meaningful while awaiting one — handled by the
    // caller, which knows whether a confirmation is pending.
    case 'confirm':
    case 'cancel':
      return null;

    case 'undo':
      if (!store.canUndo) return { message: t('voice.nothingToUndo') };
      store.undo();
      return { message: t('voice.undone') };

    case 'redo':
      if (!store.canRedo) return { message: t('voice.nothingToRedo') };
      store.redo();
      return { message: t('voice.redone') };

    case 'clear':
      if (!store.activeLayerHasContent) return { message: t('voice.layerEmpty') };
      return { message: t('voice.confirmClear'), awaitConfirm: 'clear' };

    case 'new-frame':
      if (!store.doc.frames) store.toggleAnimation(); // "new frame" implies animate
      store.addFrame();
      return { message: t('voice.newFrame') };

    case 'play':
      if (!store.doc.frames || store.doc.frames.length === 0) {
        return { message: t('voice.nothingToPlay') };
      }
      store.play();
      return { message: t('voice.playing') };

    case 'stop':
      store.pause();
      return { message: t('voice.stopped') };

    case 'tool':
      store.setTool(command.tool);
      return { message: t('voice.tool', { tool: t(`tools.${command.tool}`) }) };

    case 'mirror':
      // "Mirror on" means the vertical axis — quad is a canvas-select away.
      store.setSymmetry(command.on ? 'vertical' : 'off');
      return { message: t(command.on ? 'voice.mirrorOn' : 'voice.mirrorOff') };

    case 'color':
      store.setColor(command.color);
      return { message: t('voice.color', { color: colorName(command.name) }) };

    case 'fill-color':
      store.setColor(command.color);
      store.setTool('fill');
      return {
        message: `${t('voice.color', { color: colorName(command.name) })} ${t('voice.tool', {
          tool: t('tools.fill'),
        })}`,
      };

    case 'bigger':
      store.setSize(bigger(store.settings.size));
      return { message: t('voice.bigger') };

    case 'smaller':
      store.setSize(smaller(store.settings.size));
      return { message: t('voice.smaller') };

    case 'save':
      save();
      return { message: t('voice.saved') };

    case 'help':
      return { message: t('voice.help') };
  }
}

/** The user said yes to "clear this layer?" — do it. */
export function confirmClear(store: VoiceExecutorStore): VoiceResult {
  store.clearLayer();
  return { message: t('voice.cleared') };
}

/** The user said no — leave everything as it is. */
export function cancelClear(): VoiceResult {
  return { message: t('voice.clearCancelled') };
}
