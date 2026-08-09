# M5 · Step 01 of 9 — Extend the engine types (tokens + semantic)
> Nav: — · [Overview](00_overview.md) · [Generate tokens →](02_generate-extend.md)

## Glossary for this step
- **[TextMate scope](../foundation/glossary.md#textmate-scope)** — a dotted name (e.g. `comment.line`,
  `keyword.control`) identifying a class of syntax tokens, targeted by `editor.tokenColorCustomizations`.
- **[Semantic token](../foundation/glossary.md#semantic-token)** — a code token classified by the language's
  semantic-tokens provider (e.g. "this identifier is a parameter"), recolored via
  `editor.semanticTokenColorCustomizations`.

## Why / design
The engine is our **pure, `vscode`-free** layer (no `import * as vscode` — [conventions.md](../foundation/conventions.md#structure--architecture)).
Everything it produces is plain data: strings in, strings out. Through M4 it produced a `Palette` (8 color roles)
and `chrome` (a map of workbench color keys → hex). M5 adds two more outputs to the same result object: the colors
for **syntax tokens** and **semantic tokens**. This step only *describes the shapes* in `types.ts`; step 02 fills
them in. Doing the type first means step 02's new functions have a contract to satisfy and the compiler guides you.

The two new types map 1:1 to the two token settings VS Code exposes:
- `TokenColors` — the seven named roles `editor.tokenColorCustomizations` understands (comments, keywords, strings, numbers, types, functions, variables).
- `SemanticColors` — a `Record<string, Hex>` of semantic **token type** → color for `editor.semanticTokenColorCustomizations`.

> 📌 **Why `ThemeResult` doesn't grow until step 02.** Adding `tokens` / `semantic` as *required* fields on
> `ThemeResult` instantly breaks `generate.ts`, which still returns `{ palette, chrome }` — and a step that ends
> with the project not compiling means a real mistake of yours hides inside an error the guide told you to expect.
> So this step is **purely additive**: two new exported types nobody references yet, and a clean build. Step 02
> widens `ThemeResult` **and** rewrites `generate()` in the same breath, so that step ends green too.

> This is TypeScript-level work (audience: **Intermediate**) — interfaces and a `Record` type alias, no new API.
> The *why these exact keys* is the token-settings shape, which step 02 teaches against the Themes doc.

## Do this
This step edits **one file**: `src/engine/types.ts` — the M3 file. You're **adding** two type definitions and
nothing else; `StarterCombo`, `Palette`, `ChromeColors`, `ThemeResult` and `StyleProfile` stay exactly as M3 wrote
them. (The complete file is in [the M5 checkpoint](09_verify.md) under `### src/engine/types.ts`.)

> **Before you start:** M3's `src/engine/types.ts` must exist with `Hex`, `StarterCombo`, `Palette`,
> `ChromeColors`, `StyleProfile`, and a `ThemeResult` carrying `palette` and `chrome`.

1. Open `src/engine/types.ts`.
2. **Add** the `TokenColors` interface and the `SemanticColors` type alias **directly below the existing
   `ChromeColors` type**. The seven `TokenColors` field names are **load-bearing** — step 02 builds this exact
   object and step 03 spreads it into the `editor.tokenColorCustomizations` value, which recognizes these named
   keys.
   ```ts
   // The seven named roles editor.tokenColorCustomizations understands.
   export interface TokenColors {
     comments: Hex; keywords: Hex; strings: Hex; numbers: Hex;
     types: Hex; functions: Hex; variables: Hex;
   }

   // Semantic token type -> color, for editor.semanticTokenColorCustomizations.rules.
   export type SemanticColors = Record<string, Hex>;
   ```
3. **Leave `ThemeResult` alone this step** — it stays `{ palette, chrome }`, M3's `[M5]` comment included. Step 02
   adds its two new fields at the same moment `generate()` learns to produce them.
4. Leave `StarterCombo`, `Palette`, `ChromeColors`, and `StyleProfile` unchanged too.
5. Save and run `npm run compile`.

## Done when (this step)
- `src/engine/types.ts` exports `TokenColors` and `SemanticColors` alongside everything M3 put there.
- **`npm run compile` reports 0 errors.** Nothing references the new types yet — that's the expected state, and
  it's why this step is safe to stop on.
- No `vscode` import appears anywhere in this file (the engine stays pure).

## If it breaks
- **`'TokenColors' is declared but never used`** → a lint hint, not an error, and expected: step 02 is the first
  consumer. Don't delete it.
- **`Property 'tokens' is missing in type …` in `generate.ts`** → you added the fields to `ThemeResult` anyway.
  Take them back out; they belong in step 02, together with the `generate()` rewrite that satisfies them.
- **Errors anywhere else** → you edited an existing member instead of adding new ones. Compare against the
  checkpoint; `StarterCombo`, `Palette`, `ChromeColors`, `ThemeResult`, `StyleProfile` must be untouched.

---
> Nav: — · [Overview](00_overview.md) · [Generate tokens →](02_generate-extend.md)
