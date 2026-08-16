# M6 · Step 01 of 10 — Add the `ThemeOverrides` type
> Nav: — · [Overview](00_overview.md) · [The overrides module →](02_overrides-module.md)

## Before you continue — corrections
> Applies only if you executed M5 steps 03 and 09 before 2026-08-16. Started the guide after that date? Skip this
> section — your project already matches.

**What went wrong.** M5/03 taught per-language scoping through `config.update`'s 4th argument,
`overrideInLanguage`, which writes the value into a `"[typescript]"` block in `settings.json`. That mechanism is
real, but **it does not apply to these two settings.** VS Code only allows a language override on settings whose
declared scope is *resource-language*; `editor.tokenColorCustomizations` and
`editor.semanticTokenColorCustomizations` are application-scoped theme-customization settings, so the write is
rejected before it lands:

```
CodeExpectedError: Unable to write to Language Settings because
editor.tokenColorCustomizations is not a resource language setting.
```

VS Code closed the request to allow it as out of scope ([vscode#124997](https://github.com/microsoft/vscode/issues/124997),
[vscode#66729](https://github.com/microsoft/vscode/issues/66729)), so there is nothing to wait for. If you followed
M5 as written, a scoped apply threw and wrote nothing; a global apply (blank language box) worked and still works.

**What replaces it.** The feature stays, and it stays tokens-only — the *mechanism* moves. Instead of putting a
global-looking value inside a per-language block, we put the language **inside the value**, which is where both
settings have always supported it:

- **Semantic** — every rule key takes an optional language suffix. The selector grammar is
  `(*|tokenType)(.tokenModifier)*(:tokenLanguage)?`, so `variable` becomes `variable:typescript`
  ([Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)).
- **TextMate** — the seven named groups (`comments`, `keywords`, …) cannot carry a language at all. We swap them
  for `textMateRules`, whose `scope` is a TextMate selector, and qualify each scope with the language's root:
  `source.ts comment` matches comments **only** inside a TypeScript document, because a space-separated selector
  requires both elements present, in that order ([TextMate — Scope Selectors](https://macromates.com/manual/en/scope_selectors)).

> 🧠 **New concept — a TextMate root scope is not a languageId.** VS Code's `languageId` names the *language*
> (`typescript`); the TextMate root scope names the *grammar that tokenizes it* (`source.ts`). They agree often
> enough to be a trap and disagree exactly where it hurts: `typescript` → `source.ts`, `csharp` → `source.cs`,
> `markdown` → `text.html.markdown`. There is no published table, so we carry the handful that differ and fall back
> to `source.<languageId>` for the rest. To find the root scope of any language, open a file in it and run
> **Developer: Inspect Editor Tokens and Scopes** from the Command Palette — the bottom entry of the *textmate
> scopes* list is the root.

> 🧠 **New concept — a scoped apply now replaces the global one.** With `"[typescript]"` blocks, a scoped value sat
> *beside* the global one. Now there is one value per setting, so applying with `typescript` in the box means "this
> theme, TypeScript only" — other languages fall back to your base theme's colors. Clear the box and apply again to
> go back to all languages. We chose this over reading-merging-writing the setting because a merge would make
> `apply.ts` read state before writing it, and M2's snapshot backbone (and therefore **Revert**) depends on every
> write being a whole-value replace. Reasoning: [decision-log D11](../foundation/decision-log.md#d11--language-scoping-lives-inside-the-setting-value-and-a-scoped-apply-replaces-the-global-one).

### Do this

Everything below is in **`src/theme/apply.ts`** — the file M5/03 had you write. `applyChrome` and `applyTheme` do
**not** change, and neither does their signature, so the provider (`ThemePanelProvider.ts`) and the webview
(`main.js`) are untouched: the `apply` message still carries `languageId` exactly as before.

1. **Replace the import line for `vscode`'s config scope — there isn't one any more.** The `{ languageId }` scope
   object told VS Code *where* to write; we now always write globally, and the language lives in the value. The
   imports at the top of the file stay exactly as they are:
   ```ts
   import * as vscode from 'vscode';
   import { CHROME, TOKENS, SEMANTIC, TARGET } from './settings';
   import { ThemeResult } from '../engine/types';
   ```

2. **Add the two lookup tables directly below the imports**, above `applyChrome`. The first maps the languageIds
   whose grammar is named differently; the second says which TextMate scopes each of our seven token roles stands
   for. Both are **mandatory as written** — the hexes come from the engine, but these scope strings are what makes
   the rules match anything at all.
   ```ts
   // A TextMate root scope names the grammar, not the language: `typescript` is tokenized by `source.ts`.
   // Only the ids that differ need an entry; everything else falls back to `source.<languageId>`.
   const TEXTMATE_ROOT: Record<string, string> = {
     typescript: 'source.ts',
     typescriptreact: 'source.tsx',
     javascript: 'source.js',
     javascriptreact: 'source.js.jsx',
     csharp: 'source.cs',
     cpp: 'source.cpp',
     shellscript: 'source.shell',
     json: 'source.json',
     jsonc: 'source.json.comments',
     yaml: 'source.yaml',
     html: 'text.html.basic',
     markdown: 'text.html.markdown',
   };

   // The seven named groups of `editor.tokenColorCustomizations`, written out as the TextMate scopes they
   // stand for — this is what lets us qualify each one with a language root.
   const TOKEN_SCOPES: Array<[keyof ThemeResult['tokens'], string[]]> = [
     ['comments', ['comment']],
     ['keywords', ['keyword', 'storage']],
     ['strings', ['string']],
     ['numbers', ['constant.numeric']],
     ['types', ['entity.name.type', 'support.type']],
     ['functions', ['entity.name.function', 'support.function']],
     ['variables', ['variable']],
   ];

   function rootScope(languageId: string): string {
     return TEXTMATE_ROOT[languageId] || `source.${languageId}`;
   }
   ```

3. **Replace `applyTokens` entirely** with this version. It picks one of two value shapes and writes it globally —
   no scope object, no 4th argument:
   ```ts
   export async function applyTokens(tokens: ThemeResult['tokens'], languageId?: string): Promise<void> {
     const value = languageId
       ? {
           textMateRules: TOKEN_SCOPES.map(([role, scopes]) => ({
             name: `van-code ${role} (${languageId})`,
             scope: scopes.map((scope) => `${rootScope(languageId)} ${scope}`),
             settings: { foreground: tokens[role] },
           })),
         }
       : {
           comments: tokens.comments, keywords: tokens.keywords, strings: tokens.strings,
           numbers: tokens.numbers, types: tokens.types, functions: tokens.functions,
           variables: tokens.variables,
         };
     await vscode.workspace.getConfiguration(TOKENS.section).update(TOKENS.key, value, TARGET);
   }
   ```

4. **Replace `applySemantic` entirely.** The value shape is unchanged — `{ enabled: true, rules }`, and
   `enabled: true` is still load-bearing — but each rule **key** gains a `:<languageId>` suffix when scoped:
   ```ts
   export async function applySemantic(semantic: ThemeResult['semantic'], languageId?: string): Promise<void> {
     const rules: Record<string, string> = {};
     for (const [tokenType, hex] of Object.entries(semantic)) {
       rules[languageId ? `${tokenType}:${languageId}` : tokenType] = hex;
     }
     await vscode.workspace.getConfiguration(SEMANTIC.section)
       .update(SEMANTIC.key, { enabled: true, rules }, TARGET);
   }
   ```

5. **Leave `applyChrome` and `applyTheme` exactly as they are.** `applyTheme` still skips chrome when a
   `languageId` is given, and for the same reason as before: `workbench.colorCustomizations` has no per-language
   form at all, in a block or in its value. Scoping is still tokens-only
   ([D2](../foundation/decision-log.md#d2--per-language-scoping-is-tokens-only)).

6. Save, and let the build recompile.

**Corrected when:**
- [ ] `src/theme/apply.ts` compiles clean, and no call to `.update(...)` in it passes a 4th argument.
- [ ] With the language box **blank**, an apply still recolors code in every language — unchanged from M5.
- [ ] With `typescript` in the box, an apply no longer throws. In `settings.json`,
      `editor.tokenColorCustomizations` now holds a `textMateRules` array whose scopes read `source.ts comment`,
      `source.ts keyword`, …, and `editor.semanticTokenColorCustomizations.rules` has keys like
      `variable:typescript`. There is **no** `"[typescript]"` block anywhere.
- [ ] A `.ts` file recolors; a `.js` or `.md` file open beside it does **not**.
- [ ] The chrome does not change during that scoped apply, and **Revert** still undoes it in one click.

## Glossary for this step
- **[Role override](../foundation/glossary.md#role-override)** — one hand-picked color pinned to a named role,
  layered over whatever the profile computed for it. *(Introduced here.)*
- **Sparse map** — an object that carries **only** the keys someone actually set, rather than every possible key
  with a placeholder. Here: `{ bg: '#0a0f1e' }` means "`bg` is pinned, the other 7 palette roles are not". *(defined inline below.)*

## Why / design
Before any code can layer a hand-picked color over the formula, the engine needs a word for "the colors you
chose". That's `ThemeOverrides` — and its whole design is in one sentence: **every field is optional, at both
levels.**

```
ThemeOverrides
├── palette?   → Partial<Palette>        (any subset of the 8 chrome roles)
├── tokens?    → Partial<TokenColors>    (any subset of the 7 syntax roles)
└── semantic?  → SemanticColors          (any subset of the 13 semantic types)
```

> 🧠 **New concept — `Partial<T>` (TypeScript utility type).** `Partial<Palette>` is `Palette` with every field
> made optional: `{ bg?: Hex; surface?: Hex; … }`. It is exactly the type of "some of a Palette" — which is what a
> half-filled editor produces. You don't declare it; TypeScript builds it from `Palette`, so the day you add a 9th
> palette role, `Partial<Palette>` grows with it and the editor gets a 9th picker for free. Docs:
> [TypeScript — `Partial<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype).

`semantic` is the odd one out: `SemanticColors` is already `Record<string, Hex>` (from M5 step 01) — a map with no
fixed key list — so *it is already its own partial*. Wrapping it in `Partial<>` would only add
`| undefined` to the value type and buy nothing. We use it as-is, and the comment in the code says why — so nobody
coming to the file later "fixes" the inconsistency.

**Why optional matters so much:** an absent key is how you say *"leave this role to the formula."*
There is no `null`, no empty string, no `enabled: false` flag anywhere in this feature. Un-pinning a role in step
08 will be a plain `delete`. One representation, one meaning — and step 02's merge is 6 lines because of it.

*(TypeScript reminder — `interface X { field?: T }` marks a field optional; reading it gives `T | undefined`.
Nothing to install.)*

## Do this
This step edits **one file**: `src/engine/types.ts` — the M5 version. Nothing else in the project changes, and
nothing compiles differently yet: you're only adding a type no one calls.

> **Before you start:** `src/engine/types.ts` must be at its M5 state — it already exports `Hex`, `StarterCombo`,
> `Palette`, `ChromeColors`, `TokenColors`, `SemanticColors`, `ThemeResult` and `StyleProfile`. (The complete M5
> file is in [the M5 checkpoint](../MILESTONE_5_tokens-and-persistence/09_verify.md) under `### src/engine/types.ts`.)

1. Open `src/engine/types.ts`.
2. **Add the `ThemeOverrides` interface directly below `ThemeResult`** and above `StyleProfile` — it belongs with
   the result shapes, not with the profile registry. Type it exactly as below, comments included: those three
   comments are the whole contract of the feature, and every later step leans on them.
   ```ts
   // Your hand-picked colors, layered over whatever the profile computed.
   // Sparse on purpose: a role that isn't here is a role the formula still owns.
   export interface ThemeOverrides {
     palette?: Partial<Palette>;      // any subset of the 8 chrome roles
     tokens?: Partial<TokenColors>;   // any subset of the 7 syntax-token roles
     // SemanticColors is already Record<string, Hex> — a partial by construction.
     semantic?: SemanticColors;       // any subset of the 13 semantic token types
   }
   ```
3. Leave **everything else in the file untouched** — `Palette`, `TokenColors`, `SemanticColors` and `ThemeResult`
   keep their exact M5 shapes. In particular do **not** add an `overrides` field to `ThemeResult`: a `ThemeResult`
   is the *finished* theme, and by the time it exists the overrides have already been folded in. Keeping them out
   is what lets `applyTheme` and `ThemeHistory` stay literally unchanged this whole milestone.
4. Save. `npm run compile` should be clean — you added an exported type and used nothing new.

**Load-bearing:** the three group keys `palette`, `tokens`, `semantic`. The webview will send an object with
exactly these keys in step 06, and step 03 reads them by name; a typo here means edits that vanish with no error.
The interface **name** `ThemeOverrides` is cosmetic (it's imported by name in steps 02–04 and 09 — rename it
everywhere or nowhere).

## Done when (this step)
- `src/engine/types.ts` exports `ThemeOverrides` with three optional fields.
- `npm run compile` finishes with **no errors** and **no new warnings**.
- Nothing behaves differently in the Extension Development Host — no code imports the type yet. It's used for the
  first time in step 02 and reaches the running extension in step 04.

## If it breaks
- **`Cannot find name 'Palette'` / `'TokenColors'`** → you added the interface to the wrong file, or above the
  declarations it references. Both types live in this same file; put `ThemeOverrides` below `ThemeResult`, which
  is below both.
- **`Property 'overrides' is missing in type 'ThemeResult'`** anywhere → you added `overrides` to `ThemeResult` in
  point 3. Remove it; `ThemeResult` is unchanged in M6.
- **You wrote `semantic?: Partial<SemanticColors>`** → it compiles, and it's harmless, but the value type becomes
  `Hex | undefined` for no benefit and step 02's `isHex` filter already covers the case. Use `SemanticColors`.

---
> Nav: — · [Overview](00_overview.md) · [The overrides module →](02_overrides-module.md)
