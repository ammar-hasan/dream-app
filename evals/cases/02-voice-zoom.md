# Eval 02 — "Zoom in / zoom out" voice commands, both locales

Difficulty: ★★ (pure parser + executor + two locales + tests)

## Task

Dream's hands-free voice commands ("undo", "fill red", "play my game"…) go
through a pure parser (`src/ai/voiceCommands.ts`, per-locale
`VoiceVocabulary` tables merged into the English base) and a thin executor
(`src/ui/voiceExecutor.ts`). Teach Dream two new commands:

- **"zoom in"** → `{ kind: 'zoom-in' }` → `store.zoomIn()`
- **"zoom out"** → `{ kind: 'zoom-out' }` → `store.zoomOut()`

Requirements:

- Read `AGENTS.md` first.
- Add the intent kinds to the `VoiceCommand` union and new vocabulary fields
  (e.g. `zoomIn: Set<string>`, `zoomOut: Set<string>`) to the
  `VoiceVocabulary` interface and to BOTH tables: English ("zoom in",
  "closer", …) and Arabic (`AR_VOCAB`, normalized bare-alef no-diacritic
  forms — e.g. "كبر"/"قرّب" normalized, and their opposites). Arabic merges
  INTO English; English must keep working under the Arabic UI.
- Wire the executor: extend `VoiceExecutorStore` with `zoomIn()`/`zoomOut()`
  (the dream store already has both actions), map the intents, and return
  localized feedback via new `voice.zoom*` keys in BOTH `en.ts` and `ar.ts`.
  Wire the real store in the voice-command button path if it adapts the
  store to `VoiceExecutorStore` (find where `executeVoiceCommand` is called).
- Extend `src/ai/voiceCommands.test.ts` (English AND Arabic zoom phrases,
  filler tolerance) and `src/ui/voiceExecutor.test.ts` (each intent calls the
  right store action).
- Done when `npm run check` is green. Do not commit.

## Grader

Deterministic, in `02-voice-zoom.grader.mjs`:

1. Parser: `zoom-in`/`zoom-out` kinds exist; `EN_VOCAB` and `AR_VOCAB` both
   define `zoomIn`/`zoomOut` sets, the Arabic ones containing Arabic-script
   trigger words.
2. Executor calls `store.zoomIn()` / `store.zoomOut()`; `voice.zoom` keys
   exist in both string tables.
3. Tests were extended: `voiceCommands.test.ts` covers "zoom in" in English
   and an Arabic zoom phrase.
4. Runtime: `npx vitest run src/ai/voiceCommands.test.ts src/ui/voiceExecutor.test.ts src/ui/i18n/i18n.test.ts`
   passes.

Plus the shared gate: `npm run check` must pass.
