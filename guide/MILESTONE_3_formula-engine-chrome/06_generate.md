# M3 · Step 06 of 8 — Generate: palette → workbench chrome
> Nav: [← Generative profiles II](05_profiles-generative-2.md) · [Overview](00_overview.md) · [Panel: two dropdowns →](07_panel-selects.md)

## Why / design
A `Palette` (8 abstract roles) isn't something VS Code understands — VS Code wants **workbench color keys** like
`statusBar.background`. This file is the translator: **`paletteToChrome`** maps the 8 roles onto 20 named workbench
keys, and **`generate`** is the engine's single public entry point — give it a combo + profile, get back a
`ThemeResult`. This is still pure engine (no `vscode`); the adapter (step 07) takes the `chrome` object and hands it
to M2's `applyChrome`.

The mapping is deliberately opinionated: one palette role fans out to several related keys so the whole UI moves
together. For example `accent1` becomes both the status-bar background *and* the active activity-bar border, so the
"brand" color shows up consistently. The one computed value is `onAccent = readableOn(palette.accent1)` — the status-bar
*text* is forced to black-or-white for legibility on whatever accent the profile produced (this is why
`readableOn` exists).

> 🧠 **Workbench color keys (a quick refresher).** A *workbench color key* is one of VS Code's named, themeable UI
> colors — `editor.background`, `sideBar.background`, `statusBar.background`, and so on — set under
> `workbench.colorCustomizations` (the setting M2 already writes through `applyChrome`). The full catalogue is the
> **Theme Color reference**: [code.visualstudio.com/api/references/theme-color](https://code.visualstudio.com/api/references/theme-color).
> The 20 keys below are a curated subset that covers every visible chrome surface; you can add more later by
> extending this one function — nothing else changes.

The 20 keys, grouped by surface (so you can see the coverage):
- **Editor:** `editor.background`, `editor.foreground`
- **Side bar:** `sideBar.background`, `sideBar.foreground`, `sideBarSectionHeader.background`
- **Activity bar:** `activityBar.background`, `activityBar.foreground`, `activityBar.activeBorder`
- **Status bar:** `statusBar.background`, `statusBar.foreground`
- **Title bar:** `titleBar.activeBackground`, `titleBar.activeForeground`
- **Tabs:** `tab.activeBackground`, `tab.inactiveBackground`, `tab.activeForeground`, `tab.inactiveForeground`, `editorGroupHeader.tabsBackground`
- **Panel + focus:** `panel.background`, `panel.border`, `focusBorder`

> ⚠️ **Failure note — the status bar will look "not recolored" from here on, and that's expected.** The 20 keys
> deliberately **exclude** `statusBar.debuggingBackground` / `statusBar.debuggingForeground`, the pair M2's demo
> added. Two things compound: (a) `applyChrome` **replaces** the whole `workbench.colorCustomizations` object
> ([M2/02](../MILESTONE_2_nondestructive-backbone/02_apply.md)), so applying a generated palette *drops* M2's
> debugging keys; (b) the Extension Development Host is a window with an active debug session, so its status bar is
> painted from those debugging keys ([M2/05](../MILESTONE_2_nondestructive-backbone/05_panel-buttons.md)).
> Net effect: **under <kbd>F5</kbd> the status bar stays debug-orange while every other surface recolors.** The
> `statusBar.background` value *is* being written correctly — check the `settings.json` diff, or stop the session
> (<kbd>Shift</kbd>+<kbd>F5</kbd>) and reopen the folder to see it painted. Verify M3 on the **other** surfaces.
> *(Want the status bar themed under F5 too? Add the two `debugging*` keys to the **Status bar** group above — the
> map becomes 22 keys, and every "20 keys" count in this milestone's gates and in M5 changes with it.)*

> 🧠 **Why `ThemeResult` is `{ palette, chrome }` here.** `generate` returns both the *raw* `palette` (so the panel
> can later show swatches + a contrast readout in M4) and the *mapped* `chrome` (what actually gets written). M5
> extends the return with `tokens` and `semantic`; the `[M5]` comments mark exactly where. Don't add those now.

*(Config API reminder — the write itself still happens in the adapter via `applyChrome` (M2); this file only
*builds the value*. Keeping the mapping in the pure engine is the two-layer split from
[conventions.md](../foundation/conventions.md#structure--architecture).)*

## Do this
This step creates **one file**: `src/engine/generate.ts`.

1. Create **`src/engine/generate.ts`** next to `profiles.ts`.
2. Paste the **Code** block below.
   - It imports the types it needs plus `readableOn`, `ensureContrast` and `contrastRatio` from `./color`.
   - `paletteToChrome` is a plain function (not exported); the file exports exactly two things, `generate` and
     `worstTextContrast`.
   - `generate` calls `profile.buildPalette(combo, variant)` then wraps the result: `{ palette, chrome:
     paletteToChrome(palette) }`. **Nothing else** — the token/semantic lines are M5.
   - **`TEXT_PAIRS` + `worstTextContrast`** are the readability readout: the table names the seven keys that paint
     text on a background — the same six `on(...)` calls plus the status bar — and the function returns the
     weakest of them, together with the editor's own pair. Nothing calls it yet; the `[M4]` marker says why. The
     panel's contrast badge (M4 step 04) is its only consumer, and [step 08](08_verify.md)'s readability gate
     leans on it to prove the clamp across every theme the engine can build.
3. Keep the `[M5]` comment on `ThemeResult` in mind but add no token code. Save; it compiles against `types.ts`,
   `color.ts`.

## Code
`src/engine/generate.ts` *(the M3 version — returns `{ palette, chrome }` only; M5 adds `tokens` + `semantic`)*
```ts
// [M3 version] returns { palette, chrome } only. [M5] adds tokens + semantic.
import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult } from './types';
import { readableOn, ensureContrast, contrastRatio } from './color';

function paletteToChrome(palette: Palette): ChromeColors {
  const onAccent = readableOn(palette.accent1);
  // WCAG 1.4.3: body text needs 4.5:1. Every foreground below is clamped against the
  // background it actually sits on — not against the editor background it never touches.
  const on = (foreground: string, background: string) => ensureContrast(foreground, background, 4.5);
  return {
    'editor.background': palette.bg,
    'editor.foreground': on(palette.text, palette.bg),
    'sideBar.background': palette.surface,
    'sideBar.foreground': on(palette.text, palette.surface),
    'sideBarSectionHeader.background': palette.surfaceAlt,
    'activityBar.background': palette.surfaceAlt,
    'activityBar.foreground': on(palette.accent1, palette.surfaceAlt),
    'activityBar.activeBorder': palette.accent1,
    'statusBar.background': palette.accent1,
    'statusBar.foreground': onAccent,
    'titleBar.activeBackground': palette.surfaceAlt,
    'titleBar.activeForeground': on(palette.text, palette.surfaceAlt),
    'tab.activeBackground': palette.bg,
    'tab.inactiveBackground': palette.surface,
    'tab.activeForeground': on(palette.text, palette.bg),
    'tab.inactiveForeground': on(palette.textMuted, palette.surface),
    'editorGroupHeader.tabsBackground': palette.surface,
    'panel.background': palette.surface,
    'panel.border': palette.border,
    'focusBorder': palette.accent2,
  };
}

// The chrome pairs that paint text on a background — exactly the ones `paletteToChrome` clamps.
const TEXT_PAIRS: Array<[string, string, string]> = [
  ['editor', 'editor.foreground', 'editor.background'],
  ['sideBar', 'sideBar.foreground', 'sideBar.background'],
  ['activityBar', 'activityBar.foreground', 'activityBar.background'],
  ['statusBar', 'statusBar.foreground', 'statusBar.background'],
  ['titleBar', 'titleBar.activeForeground', 'titleBar.activeBackground'],
  ['tab.active', 'tab.activeForeground', 'tab.activeBackground'],
  ['tab.inactive', 'tab.inactiveForeground', 'tab.inactiveBackground'],
];

// [M4] What the panel badge reports. `ratio` is the WEAKEST text pair in the theme — the floor the
// whole theme is guaranteed to clear, and what the badge grades. `editor` is the editor's own
// text-on-background pair, kept alongside it because that is the number a reader watches swing as
// they cycle styles; the floor barely moves, since the clamp stops at exactly 4.5:1.
export function worstTextContrast(
  chrome: ChromeColors,
): { pair: string; ratio: number; editor: number } {
  let worstPair = TEXT_PAIRS[0][0];
  let worstRatio = Infinity;
  for (const [label, foreground, background] of TEXT_PAIRS) {
    const ratio = contrastRatio(chrome[foreground], chrome[background]);
    if (ratio < worstRatio) { worstRatio = ratio; worstPair = label; }
  }
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    pair: worstPair,
    ratio: round(worstRatio),
    editor: round(contrastRatio(chrome['editor.foreground'], chrome['editor.background'])),
  };
}

export function generate(combo: StarterCombo, profile: StyleProfile, variant?: string): ThemeResult {
  const palette = profile.buildPalette(combo, variant);
  return {
    palette,
    chrome: paletteToChrome(palette),
  };
}
```

## Done when (this step)
- `src/engine/generate.ts` exists and compiles with no errors.
- `generate` returns an object with exactly two keys, `palette` and `chrome`; `chrome` has **20** workbench keys.
- *(Optional pure check — extend the step-01 scratch pattern:
  `import { generate } from './generate'; import { comboById } from './combos'; import { profileById } from './profiles';`
  then `console.log(Object.keys(generate(comboById('deep-sea'), profileById('neon')).chrome).length)` prints `20`,
  and `...generate(...).chrome['statusBar.background']` prints Neon's brightened accent hex. Delete the scratch file
  after.)*

## If it breaks
- **`Property 'tokens' is missing`** anywhere → you're on the M5 shape too early. In M3 `ThemeResult` and `generate`
  are `{ palette, chrome }` only; keep the token lines commented.
- **A key value is `undefined` when applied** → a typo in a palette role name (e.g. `palette.surfaceAlt` misspelled). The
  8 role names are load-bearing and must match `types.ts` exactly.
- **`readableOn` / `ensureContrast` / `contrastRatio` not found** → widen the import from `./color`; this file
  needs all three (`readableOn` for the status bar, `ensureContrast` for the clamp, `contrastRatio` for
  `worstTextContrast`).
- **The sidebar, title bar or an inactive tab label is hard to read, but the editor text is fine** → a foreground
  is being clamped against the wrong background. Each `on(...)` call takes the background that key actually sits
  on: `sideBar.foreground` on `palette.surface`, `titleBar.activeForeground` on `palette.surfaceAlt`,
  `tab.inactiveForeground` on `palette.surface`. Clamping them all against `palette.bg` compiles fine and looks
  right in the editor while leaving every panel unreadable — run the readability-floor check in
  [step 08](08_verify.md) and it will name the failing pair.
- **The check says `all AA false` and the failing pair sits on a mid-tone background** → `ensureContrast` has to
  try **both** directions. A version that picks one direction from the background's luminance gives up against
  mid-tones, where lightening a dark foreground passes *through* the background before it ever clears the bar.

---
> Nav: [← Generative profiles II](05_profiles-generative-2.md) · [Overview](00_overview.md) · [Panel: two dropdowns →](07_panel-selects.md)
