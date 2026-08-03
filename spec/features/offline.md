# Offline & installability

**Purpose.** Dream is a fully offline-capable, installable app: install it,
turn the network off, and everything — drawing, saving, the library, games,
Dream AI — keeps working.

## What works offline

Everything except BYOK AI calls. Documents live on-device by design; the
built-in Dream AI is fully local; the app shell is cached after first load.
Verified behavior: load the app once, kill the network entirely, reload —
the app boots and works.

## The caching rules (behavior contract)

1. **Precache the shell only:** the app's HTML, scripts, styles, icons and
   manifest — under a cache name derived from the content of those files,
   so a new deploy always ships a new cache and old caches are deleted on
   activation.
2. **Navigations are network-first**, falling back to the cached shell
   when the network is gone.
3. **Same-origin asset requests are cache-first**, filling the cache on
   miss.
4. **Non-GET and cross-origin requests never touch the cache** — AI
   provider API calls are never cached, never intercepted.
5. The worker only exists in the production app and where the platform
   supports it; registration failure is silent and harmless.

## Updates

1. When a new version has downloaded, a quiet toast offers "**A new Dream
   is ready — Refresh**".
2. **The new version never activates on its own** — only when the user
   presses Refresh (the app then reloads once into the new version).
3. Dismissing the toast keeps the current version until the next natural
   reload; the dismissal is session-only (the toast returns next session).

## Installability

1. The app is installable to the home screen / app shelf (standalone
   window, its own icon, the theme color).
2. When the browser offers installation, the settings menu shows an
   "**Install Dream**" row with an Install button; the browser's own
   mini-infobar is suppressed in favor of this.
3. Dismissing the row is remembered forever (per device).

## The installed identity (manifest contract)

| Field             | Value                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------- |
| name / short_name | Dream                                                                                        |
| description       | "An intuitive, elegant design app — draw, design, animate and dream, right in your browser." |
| display           | standalone                                                                                   |
| start             | the app root                                                                                 |
| background color  | `#eef0f6`                                                                                    |
| theme color       | `#6d7cff`                                                                                    |
| icons             | the Dream mark as SVG (any size), 192 px and 512 px PNGs, plus a 512 px maskable tile        |

## Edge cases

- First-ever visit with no network: nothing can load (no shell cached
  yet) — offline works from the first successful load onward.
- The very first install never shows an update toast (there's no old
  version to replace).
- Private/ephemeral browsing degrades gracefully: storage failures are
  logged, never surfaced; the app still works for the session.
