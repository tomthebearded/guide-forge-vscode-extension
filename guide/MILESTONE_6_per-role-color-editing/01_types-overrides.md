# M6 · Step 01 of 10 — Add the `ThemeOverrides` type
> Nav: — · [Overview](00_overview.md) · [The overrides module →](02_overrides-module.md)

## Glossary for this step
- **[Role override](../foundation/glossary.md#role-override)** — one hand-picked color pinned to a named role,
  layered over whatever the profile computed for it. *(Introduced here.)*
- **Sparse map** — an object that carries **only** the keys someone actually set, rather than every possible key
  with a placeholder. Here: `{ bg: '#0a0f1e' }` means "`bg` is pinned, the other 7 palette roles are not". *(defined inline below.)*

## Why / design
Before any code can layer a hand-picked color over the formula, the engine needs a word for "the colors the reader
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
`| undefined` to the value type and buy nothing. We use it as-is, and the comment in the code says why so the next
reader doesn't "fix" the inconsistency.

**Why optional matters so much:** an absent key is how the reader says *"leave this role to the formula."*
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
   // The reader's hand-picked colors, layered over whatever the profile computed.
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
