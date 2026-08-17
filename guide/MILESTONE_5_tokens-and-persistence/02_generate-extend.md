# M5 · Step 02 of 9 — Widen `ThemeResult` and generate token + semantic colors
> Nav: [← Types extend](01_types-extend.md) · [Overview](00_overview.md) · [Apply tokens →](03_apply-extend.md)

## Why / design
`generate.ts` turns a `Palette` into the concrete values VS Code will write. M4's version produced only `chrome`
(a map of workbench color keys). Now we add two small pure functions — `paletteToTokens` and `paletteToSemantic` —
and have `generate()` return them alongside `chrome`. Same pattern as `paletteToChrome`: **derive** token colors
from the palette's accents/text/muted roles, so any of the 13 profiles automatically gets coordinated code colors
for free. No profile changes; the engine stays data-driven.

Two color families, two VS Code settings — and their value shapes differ, which is why we need both functions:

> 🧠 **Beginner — TextMate named keys vs. semantic token *types*.** VS Code colors code text two ways, and our two
> functions target each:
> - **`editor.tokenColorCustomizations`** is the older **TextMate** path. Besides raw `textMateRules` (scope →
>   color), it exposes a handful of **named convenience keys** — `comments`, `keywords`, `strings`, `numbers`,
>   `types`, `functions`, `variables` — that map to common scopes for you. `paletteToTokens` fills exactly those
>   seven (they're the fields you defined in step 01), so we never hand-write TextMate scopes.
> - **`editor.semanticTokenColorCustomizations`** is the newer **semantic** path. A language server labels each
>   identifier by **token type** (`variable`, `parameter`, `function`, `class`, `type`, `keyword`, …), and you map
>   *type → color* under a `rules` object. `paletteToSemantic` builds that map. Semantic colors layer *on top of*
>   TextMate ones when a language server is active. Docs: [Themes — syntax & semantic colors](https://code.visualstudio.com/docs/configure/themes)
>   and the [Semantic Highlight guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide).

Both functions run every color through `ensureContrast(color, bg, 3)` (from `color.ts`) so code text keeps at
least a 4.5:1 ratio against the background — WCAG 1.4.3's threshold for normal-size text, which is what code is.
A color that's invisible on the theme's `bg` is a bug, not a style.
`paletteToSemantic` takes the *already-built* `TokenColors` (not the palette) so syntax and semantic coloring
agree: a keyword and the semantic `keyword` type get the same hex.

## Do this
This step edits **two files**: `src/engine/types.ts` (two fields) and `src/engine/generate.ts` (the M4 file).
They travel together on purpose — widening `ThemeResult` is what makes `generate()`'s old return illegal, so the
fix ships in the same step and the build never sits red. `paletteToChrome` stays **exactly** as M4 wrote it (don't
re-type it). (Both complete files are in [the M5 checkpoint](09_verify.md).)

> **Before you start:** step 01's `TokenColors`/`SemanticColors` must be exported from `src/engine/types.ts`, and
> M4's `src/engine/generate.ts` must exist with `paletteToChrome` and a `generate()` returning `{ palette, chrome }`.

1. Open `src/engine/types.ts` and **add `tokens` and `semantic` to the `ThemeResult` interface**, directly after its
   `chrome: ChromeColors;` line (replacing M3's `// [M5] adds:` comment). Leave `palette` and `chrome` as they are:
   ```ts
     tokens: TokenColors;
     semantic: SemanticColors;
   ```
   Save it. `generate.ts` now shows *"Property 'tokens' is missing"* — the rest of this step is what clears it, so
   don't stop here.
2. Open `src/engine/generate.ts`.
3. **Widen the imports.** Add `TokenColors, SemanticColors` to the `types` import, and `mix, rotate,
   ensureContrast` to the `color` import (they're used by the new functions; `readableOn` stays — chrome uses it).
   **Replace the two import lines at the top** with:
   ```ts
   import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult, TokenColors, SemanticColors } from './types';
   import { readableOn, mix, rotate, ensureContrast, contrastRatio } from './color';
   ```
4. **Add `paletteToTokens`** directly **below the unchanged `paletteToChrome` function**. It maps each of the seven
   roles from palette accents/text/muted, each clamped to **4.5:1** against `palette.bg`.
   ```ts
   function paletteToTokens(palette: Palette): TokenColors {
     const readable = (hex: string) => ensureContrast(hex, palette.bg, 4.5);
     return {
       comments: readable(palette.textMuted),
       keywords: readable(palette.accent1),
       strings: readable(palette.accent2),
       numbers: readable(rotate(palette.accent2, 20)),
       types: readable(rotate(palette.accent1, -20)),
       functions: readable(mix(palette.accent2, palette.text, 0.2)),
       variables: readable(palette.text),
     };
   }
   ```
5. **Add `paletteToSemantic`** directly **below `paletteToTokens`**. It fans the seven token colors out to the
   semantic **token type** names a language server emits (several types share a color on purpose — e.g.
   `class`/`type`/`interface`/`enum` all use `types`).
   ```ts
   function paletteToSemantic(tokens: TokenColors): SemanticColors {
     return {
       variable: tokens.variables, parameter: tokens.variables, property: tokens.variables,
       function: tokens.functions, method: tokens.functions,
       class: tokens.types, type: tokens.types, interface: tokens.types, enum: tokens.types,
       keyword: tokens.keywords, string: tokens.strings, number: tokens.numbers, comment: tokens.comments,
     };
   }
   ```
6. **Replace `generate()`** so it computes `tokens` and returns `tokens` + `semantic` alongside `palette` and
   `chrome`:
   ```ts
   export function generate(combo: StarterCombo, profile: StyleProfile, variant?: string): ThemeResult {
     const palette = profile.buildPalette(combo, variant);
     const tokens = paletteToTokens(palette);
     return {
       palette,
       chrome: paletteToChrome(palette),
       tokens,
       semantic: paletteToSemantic(tokens),
     };
   }
   ```
7. Save. This clears the `ThemeResult` error opened in action 1, and **`npm run compile` reports 0 errors** again.

**Load-bearing:** the seven `TokenColors` keys (from step 01) and the semantic **type names** on the left of
`paletteToSemantic` (`variable`, `parameter`, `property`, `function`, `method`, `class`, `type`, `interface`,
`enum`, `keyword`, `string`, `number`, `comment`) — these are the standard type names VS Code recognizes. The
specific *derivation math* (which accent maps where, the `rotate` degrees) is **cosmetic** — tune it freely.

## Done when (this step)
- `src/engine/types.ts`'s `ThemeResult` carries `palette`, `chrome`, `tokens`, `semantic`; `src/engine/generate.ts`
  matches the checkpoint version; and the **whole engine compiles with no errors** (`npm run compile` is clean).
- Optional Node-runnable sanity check (the engine is pure, so no F5 needed). From the project root:
  ```powershell
  npm run compile
  node -e "const {generate}=require('./out/engine/generate.js');const {comboById}=require('./out/engine/combos.js');const {profileById}=require('./out/engine/profiles.js');const theme=generate(comboById('deep-sea'),profileById('neon'));console.log(theme.tokens);console.log(Object.keys(theme.semantic).length,'semantic types')"
  ```
  Expected: an object with seven `#rrggbb` fields (`comments`, `keywords`, …), then `13 semantic types`. Every
  value is a valid 7-char hex string.
- **The token readability floor, across every theme** — the token half of the sweep
  [M4's gate](../MILESTONE_4_gallery-and-ux/05_verify.md) runs on the chrome half:
  ```powershell
  node -e "const {generate}=require('./out/engine/generate.js');const {contrastRatio}=require('./out/engine/color.js');const {COMBOS}=require('./out/engine/combos.js');const {PROFILES}=require('./out/engine/profiles.js');let low=99,lowId='',n=0,collapsed=0;for(const c of COMBOS)for(const p of PROFILES)for(const v of (p.variants&&p.variants.length?p.variants:[undefined])){n++;const t=generate(c,p,v),bg=t.chrome['editor.background'],toks=Object.values(t.tokens);const m=Math.min(...toks.map(x=>contrastRatio(x,bg)));if(m<low){low=m;lowId=c.id+'/'+p.id+(v?'/'+v:'')}if(new Set(toks).size<7)collapsed++}console.log('themes',n);console.log('lowest token',Math.round(low*100)/100,lowId);console.log('all AA',low>=4.5);console.log('themes with duplicate token colors',collapsed)"
  ```
  **Expected — exactly:**
  ```
  themes 85
  lowest token 4.5 deep-sea/warm-sepia
  all AA true
  themes with duplicate token colors 17
  ```
  > 🧠 **Read the last line, don't panic at it.** `all AA true` is the assertion — every token color is legible on
  > its background. The **17** is *not* a failure: `monochrome` and `game-boy` are deliberately limited-palette
  > styles, so several roles landing on the same color is the style working, not the engine breaking. What the
  > line buys you is a tripwire — if that number jumps after you touch `paletteToTokens`, a *colorful* profile has
  > started collapsing, and the usual cause is `rotate()` being handed a near-grey (rotating the hue of a
  > desaturated color changes nothing).

## If it breaks
- **`node -e` prints `undefined` for `tokens`** → `generate()` isn't returning the new fields, or you compiled a
  stale build; re-run `npm run compile` and confirm the `return` includes `tokens` and `semantic`.
- **`Cannot find module './out/engine/...'`** → the compile hasn't run or `tsconfig` emits elsewhere; run
  `npm run compile` first and check `out/engine/generate.js` exists.
- **A token color comes out as `#ffffff` or `#111111` unexpectedly** → that's `ensureContrast` clamping when the
  derived color couldn't reach 4.5:1 against a very light/dark `bg`. Not a bug — it's the readability floor doing its
  job. Change the profile/combo if you want a different look.

---
> Nav: [← Types extend](01_types-extend.md) · [Overview](00_overview.md) · [Apply tokens →](03_apply-extend.md)
