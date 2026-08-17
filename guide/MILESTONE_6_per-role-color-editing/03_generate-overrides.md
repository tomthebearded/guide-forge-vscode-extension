# M6 · Step 03 of 10 — Thread overrides through `generate()`
> Nav: [← The overrides module](02_overrides-module.md) · [Overview](00_overview.md) · [The provider passes them through →](04_provider-overrides.md)

## Why / design
`generate()` is the engine's front door: combo + profile in, finished `ThemeResult` out. This step gives it a
fourth, optional parameter — `overrides` — and applies it at **exactly three places inside the existing pipeline**.
No new function, no new branch, no profile touched.

Where the merge lands is the whole design, so read the pipeline before you type it:

```
profile.buildPalette(combo, variant)          8 computed palette roles
        ↓  overrideRoles(…, overrides.palette)   ← ① your pinned palette roles win HERE
      palette
        ├── paletteToChrome(palette)          → 20 workbench keys, re-derived from the EDITED palette
        └── paletteToTokens(palette)          → 7 syntax roles, re-derived from the EDITED palette
                ↓  overrideRoles(…, overrides.tokens)   ← ② your pinned token roles win HERE
              tokens
                └── paletteToSemantic(tokens) → 13 semantic types, from the EDITED tokens
                        ↓  overrideRoles(…, overrides.semantic)   ← ③ your pinned types win HERE
```

Three consequences fall out of that ordering, and every one of them is something you'll observe in the panel
within two steps:

- **① is why one picker moves a whole group.** Pin `bg` and *all 20* workbench keys are computed again from your
  hex — `editor.background`, `tab.activeBackground`, and the rest — instead of only the one key literally named
  "background". That is the payoff of overriding a **role** rather than a VS Code key
  (→ [D9](../foundation/decision-log.md#d9--overrides-are-role-level-not-vs-code-key-level)).
- **① also re-runs the readability floor.** `paletteToTokens` clamps every token color to ≥ 3:1 against
  `palette.bg` via `ensureContrast` (M5 step 02). Because the override lands *before* that call, pinning a
  near-white `bg` makes the token colors darken to stay legible on it. Contrast protection keeps working on colors
  the formula never chose.
- **② is why editing `keywords` also moves the semantic `keyword` type.** `paletteToSemantic` reads the *merged*
  tokens. That's usually what you want — syntax and semantic coloring agreeing was M5's explicit goal — and when
  it isn't, pinning the semantic type separately at ③ wins, because ③ runs last.

> 🧠 **Reminder — optional parameters (New in M3's `variant`).** `overrides?: ThemeOverrides` goes **after**
> `variant?`, because an optional parameter can't precede a required one and every existing call site
> (`generate(combo, profile)` and `generate(combo, profile, variant)`) must keep compiling untouched. Callers that
> don't care never learn the feature exists — which is why the provider is the *only* file that changes in step 04.

## Do this
This step edits **one file**: `src/engine/generate.ts` — the M5 version. `paletteToChrome`, `paletteToTokens` and
`paletteToSemantic` stay **exactly** as M5 wrote them; you widen two imports, add one, and rewrite the six-line
`generate()`. (The complete file is in [the M6 checkpoint](10_verify.md) under `### src/engine/generate.ts`.)

> **Before you start:** step 02's `src/engine/overrides.ts` must compile, and `src/engine/generate.ts` must be at
> its M5 state — a `generate()` returning `{ palette, chrome, tokens, semantic }`.

1. Open `src/engine/generate.ts`.
2. **Widen the types import** to bring in `ThemeOverrides`, and **add the `overrides` import**. Replace the two
   existing import lines at the top with these three:
   ```ts
   import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult, ThemeOverrides, TokenColors, SemanticColors } from './types';
   import { readableOn, mix, rotate, ensureContrast } from './color';
   import { overrideRoles } from './overrides';
   ```
3. **Leave `paletteToChrome`, `paletteToTokens` and `paletteToSemantic` completely alone.** Scroll past them.
   They are pure functions of a palette / of tokens, and the merged values reach them as ordinary arguments — the
   whole reason this step is six lines instead of sixty.
4. **Replace `generate()`** at the bottom of the file. Note that `palette` and `tokens` are now the *merged*
   values, so the three derivations below them need no edit at all:
   ```ts
   export function generate(
     combo: StarterCombo,
     profile: StyleProfile,
     variant?: string,
     overrides?: ThemeOverrides,
   ): ThemeResult {
     // ① pinned palette roles win before anything is derived from the palette
     const palette = overrideRoles(profile.buildPalette(combo, variant), overrides?.palette);
     // ② pinned token roles win before the semantic map is fanned out from them
     const tokens = overrideRoles(paletteToTokens(palette), overrides?.tokens);
     return {
       palette,
       chrome: paletteToChrome(palette),
       tokens,
       // ③ pinned semantic types win last, so they can disagree with ②
       semantic: overrideRoles(paletteToSemantic(tokens), overrides?.semantic),
     };
   }
   ```
5. Save and run `npm run compile`. It must be clean: every existing caller passes 2 or 3 arguments and still
   type-checks, because the 4th is optional.

**Load-bearing:** the **order** of the three merges (a merge moved after its derivation silently stops
propagating — pin `bg` and only `editor.background` would change); `overrides?.palette` / `?.tokens` / `?.semantic`
matching the group keys from step 01. The `①②③` comments are cosmetic.

## Done when (this step)
- `npm run compile` is clean and `generate()` takes four parameters, the last two optional.
- Pure-engine check, **no F5 required**. From the project root:
  ```powershell
  npm run compile
  node -e "const {generate}=require('./out/engine/generate.js');const {comboById}=require('./out/engine/combos.js');const {profileById}=require('./out/engine/profiles.js');const c=comboById('deep-sea'),p=profileById('neon');const plain=generate(c,p);const pinned=generate(c,p,undefined,{palette:{bg:'#0a0f1e'}});console.log('palette.bg      ',plain.palette.bg,'->',pinned.palette.bg);console.log('editor.background',plain.chrome['editor.background'],'->',pinned.chrome['editor.background']);console.log('tab.activeBackground',plain.chrome['tab.activeBackground'],'->',pinned.chrome['tab.activeBackground']);console.log('junk ignored:',generate(c,p,undefined,{palette:{bg:'banana'}}).palette.bg===plain.palette.bg);console.log('untouched roles:',pinned.palette.accent1===plain.palette.accent1)"
  ```
  **Expected:** the three arrows all end in **`#0a0f1e`** (the same pinned hex reaching the palette role *and* two
  different workbench keys derived from it — that's consequence ①), then:
  ```
  junk ignored: true
  untouched roles: true
  ```
  The left-hand side of each arrow is whatever Neon derived for Deep Sea; the only value this check asserts is that
  all three right-hand sides are the hex you pinned, and that nothing you didn't pin moved.
- Still **nothing visible in the Extension Development Host** — the panel has no way to send an `overrides` object
  yet. It gets one in step 04 (provider) and step 06 (webview).

## If it breaks
- **`editor.background` didn't change but `palette.bg` did** → the merge is happening *after* `paletteToChrome`.
  `overrideRoles` must wrap `profile.buildPalette(...)` itself, so the merged palette is what gets derived from.
- **`untouched roles: false`** → you spread the overrides over the palette instead of using `overrideRoles`, so an
  `undefined` key overwrote a good value. Step 02's warning covers this exactly.
- **`TS2554: Expected 4 arguments, but got 2`** → you dropped a `?` and made a parameter required. Both `variant`
  and `overrides` are optional; the existing M5 call sites pass neither.
- **`Property 'palette' does not exist on type 'ThemeOverrides'`** → `overrides?.palette` is being read off the
  wrong type, usually because the import in point 2 pulled in `ThemeResult` where you meant `ThemeOverrides`.
- **A pinned `keywords` color doesn't reach the semantic `keyword` type** → merge ② is below `paletteToSemantic`
  in your file. `tokens` must be merged *before* it's passed in.

---
> Nav: [← The overrides module](02_overrides-module.md) · [Overview](00_overview.md) · [The provider passes them through →](04_provider-overrides.md)
