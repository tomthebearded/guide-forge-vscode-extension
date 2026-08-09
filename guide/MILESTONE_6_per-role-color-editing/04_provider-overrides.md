# M6 · Step 04 of 10 — The provider passes overrides through and echoes the effective colors back
> Nav: [← Thread them through `generate()`](03_generate-overrides.md) · [Overview](00_overview.md) · [Style the role rows →](05_styles-editor.md)

## Glossary for this step
- **[Effective color](../foundation/glossary.md#effective-color)** — the color a role *ended up* with after the
  formula ran and any override was layered on. It's what the editor is actually painted with, and therefore what a
  role's swatch must display. *(Introduced here.)*

## Why / design
The engine can now take overrides (step 03) and the panel will produce them (step 06). The provider is the wire
between them, and it carries traffic in **both** directions:

- **Webview → extension.** The `apply` message gains one field, `overrides`, forwarded verbatim as `generate()`'s
  4th argument. The provider does **not** validate it — `isHex` already does, inside the merge, on every single
  value. One gate, in the pure layer, is the whole point of step 02.
- **Extension → webview.** The `applied` message must now carry **`tokens` and `semantic`** alongside the
  `palette` it already sent. This is the half that's easy to miss, so here is why it's mandatory:

> 🧠 **New concept — the picker needs the *effective* color, and only the extension knows it.** A role's swatch
> has to show the color that role currently *is*. For a pinned role that's the reader's own hex, which the webview
> obviously knows. For the other 25 it's a value the formula computed — `#3ec6ff` rotated by −20° and clamped to
> 3:1 against the background — and the webview has no engine, no combos and no profiles. It literally cannot
> compute it. So the extension sends all three finished maps back after every apply, and the webview's rule for
> what to display becomes a single line it can execute with no color knowledge at all:
>
> ```
> shown = my override for this role  ??  the effective color the extension just sent
> ```
>
> This is the same *data-driven rendering* contract M4 set up for the profile list (the webview draws whatever
> `init` carries and hardcodes nothing) — extended from "which styles exist" to "what color is each role right now".

Everything else in this file stays exactly as M5 left it. In particular `applyTheme`, `ThemeHistory` and
`src/theme/*` are **not touched in this milestone at all**: an override changes the *values* inside a
`ThemeResult`, never its shape, so the one write path and the snapshot backbone can't tell the difference. That is
the payoff of merging inside `generate()` rather than at the settings boundary.

## Do this
This step edits **one file**: `src/panel/ThemePanelProvider.ts` — the M5 version. You change **three regions**: the
types import, the `last` field, and the body of `case 'apply'`. Every other case (`ready`, `revert`, `reset`,
`save`, `applySet`, `delete`, `export`, `import`), the constructor, `resolveWebviewView`, `getHtml` and `getNonce`
are untouched here — `save` and `applySet` get their own edits in step 09. (The complete file is in
[the M6 checkpoint](10_verify.md) under `### src/panel/ThemePanelProvider.ts`.)

> **Before you start:** step 03 must compile — this step calls `generate()` with a 4th argument, which is a type
> error until `generate` accepts one. `src/panel/ThemePanelProvider.ts` must be at its M5 state (it already
> imports `generate`, `contrastRatio` and the storage helpers).

1. Open `src/panel/ThemePanelProvider.ts`.
2. **Add one import.** The provider needs the `ThemeOverrides` type to remember the last selection. Add this line
   **directly below the existing `import { generate } from '../engine/generate';` line**:
   ```ts
   import { ThemeOverrides } from '../engine/types';
   ```
3. **Widen the `last` field** so a re-generate (step 09's **Save**) reproduces the theme the reader is actually
   looking at, overrides included. Replace the `private last?: …` line with:
   ```ts
   private last?: { comboId: string; profileId: string; variant?: string; overrides?: ThemeOverrides };
   ```
4. **Rewrite the body of `case 'apply'`.** Two edits inside it: remember and forward `m.overrides`, and send the
   token + semantic maps back. Replace the whole `case 'apply': { … }` block with:
   ```ts
   case 'apply': {
     this.last = { comboId: m.comboId, profileId: m.profileId, variant: m.variant, overrides: m.overrides };
     const theme = generate(comboById(m.comboId), profileById(m.profileId), m.variant, m.overrides);
     await this.history.apply(() => applyTheme(theme, m.languageId || undefined));
     this.post({
       type: 'applied',
       palette: theme.palette,
       tokens: theme.tokens,        // NEW — the 7 effective syntax-token colors
       semantic: theme.semantic,    // NEW — the 13 effective semantic-type colors
       contrast: Math.round(contrastRatio(theme.palette.text, theme.palette.bg) * 100) / 100,
     });
     break;
   }
   ```
   `m.overrides` is `undefined` for any message that doesn't carry the field — an M5-era webview, or the
   `apply()` you're about to write before the editor exists — and `generate()` handles `undefined` as "no
   overrides" (step 03). So this compiles and behaves *identically to M5* until step 06 starts sending a value.
5. **Do not touch the `history.apply(...)` wrapper.** It still takes one snapshot per `apply` message. Step 08
   depends on that being exactly as true for a color edit as it is for a preset pick.
6. Save and run `npm run compile`.

**Load-bearing:** the field name `overrides` on the incoming message and the field names `tokens` / `semantic` on
the outgoing `applied` message — the webview reads all three by name in steps 06–07, and a mismatch is silent (a
webview message with an unknown field is simply ignored, no error anywhere). The `// NEW` comments are cosmetic.

## Done when (this step)
- `npm run compile` is clean.
- Press <kbd>F5</kbd> and use the panel as you did in M5: picking a combo or a style still recolors chrome and
  code, Revert/Reset still work, saved sets still apply. **Nothing looks different** — that's the pass condition.
  This step is a widening, not a feature: the extra `tokens`/`semantic` fields are arriving in the webview and
  being ignored, because nothing reads them until step 06.
- Optional proof the new fields really are on the wire, without any UI: in the Extension Development Host open
  **Help → Toggle Developer Tools → Console**, then in the panel pick any style. The webview's
  `window.addEventListener('message', …)` from M5 already receives the object; type
  `window.addEventListener('message', e => console.log(e.data))` into that console *before* picking, and the logged
  `applied` message shows `palette`, `tokens`, `semantic` and `contrast`.

## If it breaks
- **`Expected 3 arguments, but got 4`** on `generate(...)` → step 03 isn't saved/compiled; `generate` still has the
  M5 signature.
- **`Property 'overrides' does not exist on type …`** on `this.last = …` → point 3's widened field type wasn't
  applied, or you widened a different declaration. It's the one `private last?:` line in the class.
- **Colors stopped applying entirely after this edit** → the rewritten `case 'apply'` lost its `break;` and fell
  through into `case 'revert'`. Every case in this switch ends with `break` (or a `return` inside a guard).
- **`Cannot find module '../engine/types'`** → the provider lives in `src/panel/`, so the engine is one level up:
  `../engine/types`, matching the `../engine/generate` import right above it.

---
> Nav: [← Thread them through `generate()`](03_generate-overrides.md) · [Overview](00_overview.md) · [Style the role rows →](05_styles-editor.md)
