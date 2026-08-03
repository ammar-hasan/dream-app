# Internationalization

**Purpose.** Every user-visible word lives in a string table, so the whole
product — including voice — works in any language, including right-to-left.

## Locales

| Id   | Label              | Direction     |
| ---- | ------------------ | ------------- |
| `en` | English            | left-to-right |
| `ar` | العربية            | right-to-left |
| `fa` | فارسی              | right-to-left |
| `zh` | 简体中文           | left-to-right |
| `pt` | Português (Brasil) | left-to-right |

Default: `en`. The settings gear switches language **instantly at runtime**
(no reload); the choice persists per user.

## The string rules

1. **No literal user-visible strings anywhere in the UI.** Every label,
   message, tooltip, dialog and error renders from the string table.
2. **Parity is enforced:** every locale's table contains exactly the same
   keys — no missing, no extras, no empty values. (Automated tests assert
   this for the shipping implementation.)
3. **Fallback chain:** a missing translation falls back to English; a
   missing key falls back to the key itself. Partial dictionaries still
   work.
4. Strings support variable interpolation ("Frame {done} of {total}…").
5. **Adding a locale** means translating the full table and registering id,
   label and direction — nothing else in the product changes.

## RTL (Arabic and Persian)

1. Choosing an RTL locale flips the whole shell: the root direction
   attribute becomes `rtl` and the language attribute follows.
2. **The layout mirrors completely** — rails, panels, toolbar groups,
   progress and playback chrome all reflect. This works because layout is
   built on logical (start/end) rather than physical (left/right)
   positioning; a rebuild must do the same.
3. RTL composes with kid mode and comfort mode.
4. Numbers and sizes (coordinates, "1024 × 768", fps) stay in Western
   digits, tabular-aligned.

## Voice and speech across locales

- The voice-command vocabulary is **per-locale** (see the full intent table
  in `accessibility.md`): Arabic, Persian, Simplified Chinese and Brazilian
  Portuguese commands work in their matching UI — and **English keeps
  working** because every additional vocabulary merges into the English base.
- Arabic transcripts are normalized before matching: diacritics and
  tatweel stripped, alef variants unified.
- Persian transcripts normalize Arabic keyboard variants of yeh and kaf;
  recognition requests Iranian Persian.
- Simplified Chinese recognition requests Mainland Mandarin. Commands match
  natural unspaced Chinese utterances without requiring users to speak one
  word at a time.
- Brazilian Portuguese recognition requests the Brazilian regional language;
  its command, story and game vocabulary uses familiar Brazilian phrasing.
- Speech recognition listens in the UI language for canvas commands.
- Spoken tool names and voice feedback speak in the UI language.

## Tone in every locale

Copy is warm, plain and encouraging in every locale (see
`../visual-identity.md` §Tone of voice). Arabic copy uses the same
friendly register — "تراجع!" for "Took that back!", not a literal or
formal translation. Persian copy uses concise, conversational Iranian
Persian rather than Arabic wording or stiff word-for-word translation.
Simplified Chinese uses familiar Mainland product language, compact labels and
natural encouragement rather than translated English sentence structure.
Brazilian Portuguese uses conversational `você`, familiar product terms and
Brazilian phrasing rather than European forms.
