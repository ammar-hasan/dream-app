# Storage — what persists where

Everything Dream stores lives **on the user's device**. There is no
account, no server, no sync. This file is the conceptual contract first;
the exact key names of the web implementation are listed at the end as a
labeled data contract.

## The persistence map

| What                                                                     | Scope                     | Lifetime                       | Notes                                              |
| ------------------------------------------------------------------------ | ------------------------- | ------------------------------ | -------------------------------------------------- |
| Projects (whole documents)                                               | per device                | until deleted                  | the project library; autosaved                     |
| Component library                                                        | per device, cross-project | until deleted                  | shared by all projects                             |
| UI preferences (kid mode, voices, theme, comfort, locale, recent colors) | per user/device           | until changed                  | never per document                                 |
| Last-opened document pointer                                             | per device                | overwritten on each autosave   | drives launch restore                              |
| AI provider settings (URL, model, toggles)                               | per device                | until changed                  | never contains API keys                            |
| AI API keys                                                              | per session by default    | gone when the app closes       | opt-in "remember key" moves them to device storage |
| AI free-tier counter                                                     | per device                | resets each local calendar day |                                                    |
| Play-mode best score                                                     | per project, per device   | until beaten                   | does NOT travel with `.dream` exports              |
| One-time hints (welcome card, install prompt dismissal)                  | per device                | once dismissed, forever        |                                                    |

## Behavioral rules

1. **Autosave.** The open document is saved automatically 800 ms after the
   last edit. Autosave also records the document as the last-opened one.
   Save failures are logged but never interrupt the user.
2. **Launch restore.** On start, the app shows a splash while it reloads
   the last-opened document. If none exists or loading fails, the app opens
   a fresh default document (1024×768, white background, one layer) — the
   splash lifts either way.
3. **Dirty indicator.** The document name in the toolbar carries a `•`
   while there are unsaved changes.
4. **Session-only state.** The following are deliberately NOT persisted:
   the active tool and tool settings, zoom and pan, symmetry mode, playback
   state, Play/Present workspace mode (reopen as Draw), the wand's floating
   region, dialog state.
5. **Outside-undo document state.** Workspace mode, animation settings,
   game casting/settings, the narration take and active-frame switching are
   saved with the document but are never undone (see `../product.md`
   principle 3).
6. **Keys are secrets.** AI API keys are never written to device storage
   unless the user explicitly ticks "remember key", are never included in
   the settings blob, never logged, and never appear in error messages.
   Switching the remember-key preference moves the key between stores and
   clears it from the other.

## The web storage contract (data contract)

The live web implementation persists through the browser. These names ARE
the compatibility contract for that implementation (existing users' data
must keep working); other platforms need only satisfy the conceptual map
above.

- **On-device database** `dream` (version 2), with two object stores keyed
  by `id`: `projects` (whole documents) and `components`.
- **Per-device keys** (browser local storage):

| Key                             | Value                                                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dream:kid-mode`                | `'1'` / `'0'`                                                                                                                                                    |
| `dream:speak-tool-names`        | `'1'` / `'0'` (defaults to the kid-mode value)                                                                                                                   |
| `dream:voice-feedback`          | `'1'` / `'0'` (defaults to the kid-mode value)                                                                                                                   |
| `dream:locale`                  | locale id, e.g. `'en'`, `'ar'`, `'fa'`, `'zh'`, `'pt'`, `'ru'` (default `'en'`)                                                                                  |
| `dream:theme`                   | `'light'` / `'dark'`; absent = follow the OS preference                                                                                                          |
| `dream:comfort-mode`            | `'1'` / `'0'`                                                                                                                                                    |
| `dream:recent-colors`           | JSON array of hex colors, newest first, max 8                                                                                                                    |
| `dream:last-doc-id`             | document id; written on every autosave                                                                                                                           |
| `dream:hint-dismissed`          | `'1'`                                                                                                                                                            |
| `dream:install-dismissed`       | `'1'`                                                                                                                                                            |
| `dream:high-score:<documentId>` | best score as an integer string                                                                                                                                  |
| `dream:ai-usage`                | JSON `{ date: 'YYYY-MM-DD', count: number }` (local calendar day)                                                                                                |
| `dream:ai-config`               | JSON `{ activeId, providers: { 'openai-compatible': { baseUrl?, model?, imageModel?, editsModel?, supportsImages?, rememberKey? } } }` — **never contains keys** |
| `dream:ai-key:<providerId>`     | the API key; session storage by default, local storage only with "remember key"                                                                                  |
