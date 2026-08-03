/**
 * Voice-command executor — the thin layer between the pure parser
 * (`ai/voiceCommands.ts`) and the store. It maps each intent to store
 * actions and returns the friendly message to speak/show. It is written
 * against a minimal store interface so tests can drive it with a fake.
 */

import type { VoiceCommand } from '../ai/voiceCommands';
import type { Color, DreamDocument, GameTemplateId, ToolId, WorkspaceMode } from '../engine/types';
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
  /** Current Design selection and whether its layer permits transforms. */
  selectionCount: number;
  selectionTransformable: boolean;
  selectionRecolorable: boolean;
  undo(): void;
  redo(): void;
  clearLayer(): void;
  toggleAnimation(): void;
  addFrame(): void;
  /** Open the visible storyboard confirmation flow. */
  openStoryboard(prompt?: string): void;
  play(): void;
  pause(): void;
  setMode(mode: WorkspaceMode): void;
  startGame(): void;
  stopGame(): void;
  /** Choose the Play-mode game template ("play flappy" / "play maze"). */
  setGameTemplate(template: GameTemplateId): void;
  /** Open Present mode as an interactive app preview. */
  previewApp(): void;
  /** Download the standalone HTML prototype. */
  exportApp(): void;
  /** Download the AI-generated "real code" HTML file. */
  exportCode(): void;
  setTool(tool: ToolId): void;
  setColor(color: Color): void;
  setSize(size: number): void;
  setStabilization(stabilization: number): void;
  scaleSelection(factor: number): void;
  nudgeSelection(dx: number, dy: number): void;
  centerSelection(): void;
  placeSelection(edge: 'left' | 'right' | 'top' | 'bottom'): void;
  recolorSelection(color: Color): void;
  deleteSelection(): void;
  duplicateSelection(): void;
  setSymmetry(mode: SymmetryMode): void;
  /** True while a narration take is being recorded. */
  narrationRecording: boolean;
  /** Start a narration take (mic + playback); errors surface via wiring. */
  startNarration(): void;
  /** Stop and save the current take. */
  stopNarration(): void;
  /** Delete the saved take. */
  deleteNarration(): void;
}

export interface VoiceResult {
  /** Feedback to speak (when voices are on) and show in the status bar. */
  message: string;
  /** Set when the command needs a spoken yes/no before it runs. */
  awaitConfirm?: 'clear';
  /** Set when Dream needs one directional answer before moving artwork. */
  awaitClarify?: 'selection-direction';
}

export interface VoiceExecutorContext {
  lastNudge: 'left' | 'right' | 'up' | 'down' | null;
}

const MIN_SIZE = 1;
const MAX_SIZE = 64;
const VOICE_NUDGE = 10;

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
  context?: VoiceExecutorContext,
): VoiceResult | null {
  if (context && command.kind !== 'move-selection' && command.kind !== 'repeat-selection-move') {
    context.lastNudge = null;
  }
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

    case 'storyboard':
      store.openStoryboard(command.prompt);
      return { message: t('voice.storyboard') };

    case 'play':
      if (!store.doc.frames || store.doc.frames.length === 0) {
        return { message: t('voice.nothingToPlay') };
      }
      store.play();
      return { message: t('voice.playing') };

    case 'play-game':
      if (command.template) store.setGameTemplate(command.template);
      store.setMode('play');
      store.startGame();
      return { message: t('voice.playGame') };

    case 'preview-app':
      if (!store.doc.frames || store.doc.frames.length === 0) {
        return { message: t('voice.noApp') };
      }
      store.previewApp();
      return { message: t('voice.previewApp') };

    case 'export-app':
      if (!store.doc.frames || store.doc.frames.length === 0) {
        return { message: t('voice.noApp') };
      }
      store.exportApp();
      return { message: t('voice.exportApp') };

    case 'export-code':
      if (!store.doc.frames || store.doc.frames.length === 0) {
        return { message: t('voice.noApp') };
      }
      store.exportCode();
      return { message: t('voice.exportCode') };

    case 'stop':
      store.pause();
      store.stopGame();
      return { message: t('voice.stopped') };

    case 'record-narration':
      if (!store.doc.frames || store.doc.frames.length === 0) {
        return { message: t('voice.narrationNeedsFrames') };
      }
      if (store.narrationRecording) return { message: t('voice.narrationAlready') };
      store.startNarration();
      return { message: t('voice.narrationStarted') };

    case 'stop-recording':
      if (!store.narrationRecording) return { message: t('voice.narrationNotRecording') };
      store.stopNarration();
      return { message: t('voice.narrationSaved') };

    case 'delete-narration':
      if (!store.doc.narration) return { message: t('voice.narrationNone') };
      store.deleteNarration();
      return { message: t('voice.narrationDeleted') };

    case 'delete-selection':
      if (store.selectionCount === 0) return { message: t('voice.selectionNeeded') };
      if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
      store.deleteSelection();
      return { message: t('voice.selectionDeleted') };

    case 'duplicate-selection':
      if (store.selectionCount === 0) return { message: t('voice.selectionNeeded') };
      if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
      store.duplicateSelection();
      return { message: t('voice.selectionDuplicated') };

    case 'clarify-selection-move':
      if (store.selectionCount === 0) return { message: t('voice.selectionMoveNeeded') };
      if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
      return {
        message: t('voice.selectionMoveWhichWay'),
        awaitClarify: 'selection-direction',
      };

    case 'move-selection': {
      if (context) context.lastNudge = null;
      if (store.selectionCount === 0) return { message: t('voice.selectionMoveNeeded') };
      if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
      if (command.direction === 'center') {
        store.centerSelection();
        return { message: t('voice.selectionCentered') };
      }
      const offsets = {
        left: [-VOICE_NUDGE, 0],
        right: [VOICE_NUDGE, 0],
        up: [0, -VOICE_NUDGE],
        down: [0, VOICE_NUDGE],
      } as const;
      const [dx, dy] = offsets[command.direction];
      store.nudgeSelection(dx, dy);
      if (context) context.lastNudge = command.direction;
      const messageKey = `voice.selectionMoved${command.direction[0]!.toUpperCase()}${command.direction.slice(1)}`;
      return { message: t(messageKey) };
    }

    case 'repeat-selection-move':
      if (!context?.lastNudge) return { message: t('voice.nothingToRepeat') };
      return executeVoiceCommand(
        { kind: 'move-selection', direction: context.lastNudge },
        store,
        save,
        context,
      );

    case 'place-selection': {
      if (store.selectionCount === 0) return { message: t('voice.selectionPlaceNeeded') };
      if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
      store.placeSelection(command.edge);
      const messageKey = `voice.selectionPlaced${command.edge[0]!.toUpperCase()}${command.edge.slice(1)}`;
      return { message: t(messageKey) };
    }

    case 'tool':
      store.setTool(command.tool);
      return { message: t('voice.tool', { tool: t(`tools.${command.tool}`) }) };

    case 'mirror':
      // "Mirror on" means the vertical axis — quad is a canvas-select away.
      store.setSymmetry(command.on ? 'vertical' : 'off');
      return { message: t(command.on ? 'voice.mirrorOn' : 'voice.mirrorOff') };

    case 'stabilization':
      store.setStabilization(command.on ? 60 : 0);
      return {
        message: t(command.on ? 'voice.stabilizationOn' : 'voice.stabilizationOff'),
      };

    case 'color':
      if (command.selection) {
        if (store.selectionCount === 0) return { message: t('voice.selectionColorNeeded') };
        if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
        if (!store.selectionRecolorable) return { message: t('voice.selectionPixels') };
        store.recolorSelection(command.color);
        return {
          message: t('voice.selectionColor', {
            color: colorName(command.name).toLocaleLowerCase(),
          }),
        };
      }
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
      if (store.selectionCount > 0) {
        if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
        store.scaleSelection(1.15);
        return { message: t('voice.selectionBigger') };
      }
      store.setSize(bigger(store.settings.size));
      return { message: t('voice.bigger') };

    case 'smaller':
      if (store.selectionCount > 0) {
        if (!store.selectionTransformable) return { message: t('voice.selectionLocked') };
        store.scaleSelection(1 / 1.15);
        return { message: t('voice.selectionSmaller') };
      }
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
