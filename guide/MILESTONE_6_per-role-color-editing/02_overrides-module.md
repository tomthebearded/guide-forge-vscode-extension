# M6 · Step 02 of 10 — `src/engine/overrides.ts` — validate a hex, merge a sparse patch
> Nav: [← The `ThemeOverrides` type](01_types-overrides.md) · [Overview](00_overview.md) · [Thread them through `generate()` →](03_generate-overrides.md)

## Glossary for this step
- **Type guard** — a function whose return type is written `value is Hex` instead of `boolean`. When it returns
  `true`, TypeScript *narrows* the argument's type for the rest of the block, so you can use it as a `Hex` without
  a cast. *(defined inline below.)*

## Why / design
This is the entire mechanism of the milestone, in one small pure file. It answers two questions:

1. **Is this even a color?** The hexes arriving here were typed by a person into a text box inside a webview.
   `banana`, `#f00`, `rgb(1,2,3)` and an empty string are all things a reader will produce. The engine has no
   business throwing at any of them — from M3 it has been *total*: give it anything, it returns a valid theme
   (`comboById`'s `?? COMBOS[0]` is the same reflex). So `isHex` is the gate, and a value that fails it is
   **dropped**, not raised.
2. **How do a full theme and a half-filled patch combine?** `overrideRoles(base, chosen)` copies `base`, then lets
   every *valid* hex in `chosen` win. Anything else — a missing key, an `undefined`, a `banana` — leaves the
   generated value alone.

> ⚠️ **Why not `Object.assign({}, base, chosen)` (or `{ ...base, ...chosen }`)?** Because a spread copies keys that
> hold `undefined` **too**. `{ ...{bg:'#111111'}, ...{bg: undefined} }` is `{ bg: undefined }`, not `{ bg:'#111111' }` —
> the "empty" edit would erase the formula's color and hand `undefined` to VS Code as a theme value. Filtering by
> `isHex` instead of by key presence sidesteps that *and* the junk-input case in one pass. The `node -e` check at
> the bottom of this step is exactly this trap, run for real.

> 🧠 **New concept — a generic over the three groups (`<T extends object>`).** The merge is identical for palette
> roles, token roles and semantic types, and only the *shape* differs. Writing it three times would be three places
> to fix a bug. `overrideRoles<T extends object>(base: T, chosen?: Partial<T>): T` says "whatever shape you hand me,
> you get the same shape back" — call it with a `Palette` and TypeScript infers `T = Palette`, so the result is a
> `Palette` and a typo'd role name is a compile error at the call site. Docs:
> [TypeScript — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html).

The `as T` on the return line is the one place we tell TypeScript something it can't prove. We deliberately
widened the accumulator to a plain `Record<string, Hex>` so we could filter by value without fighting generic index
writes; the *shape* is unchanged (we only ever wrote keys that came from `chosen: Partial<T>`), so the cast states
a fact rather than papering over a doubt. The comment in the code says so.

## Do this
This step creates **one file**: `src/engine/overrides.ts`, a sibling of `color.ts` and `generate.ts`. It imports
only from `./types` — no `vscode`, so it stays in the pure layer
(→ [conventions.md](../foundation/conventions.md#structure--architecture)) and is checkable in plain Node at the
bottom of this step.

> **Before you start:** step 01's `ThemeOverrides` must be exported from `src/engine/types.ts` — `countOverrides`
> takes it as its parameter type.

1. In `src/engine/`, create the file **`src/engine/overrides.ts`**.
2. **Import the two types it needs** and declare the hex pattern. `HEX_6` is module-level and `SCREAMING_SNAKE`
   per [conventions.md](../foundation/conventions.md#naming); the `i` flag accepts `#AABBCC` as readily as
   `#aabbcc`, because `<input type="color">` emits lowercase while a reader typing by hand often doesn't.
   At the **top of `src/engine/overrides.ts`**:
   ```ts
   import { Hex, ThemeOverrides } from './types';

   // A color arriving from the webview is untrusted text — the reader can type anything
   // into the hex box. Exactly 7 chars, '#' + 6 hex digits, is a color. Nothing else is.
   const HEX_6 = /^#[0-9a-f]{6}$/i;
   ```
3. **Add `isHex`** below it — the type guard every other function in the feature leans on.
   ```ts
   export function isHex(value: unknown): value is Hex {
     return typeof value === 'string' && HEX_6.test(value);
   }
   ```
   The parameter is `unknown`, not `string`, on purpose: its callers hand it values straight off a JSON message,
   where TypeScript knows nothing. `typeof value === 'string'` is what earns the right to call `.test`.
4. **Add `overrideRoles`** below `isHex`. This is the merge — six lines, and the only place a hand-picked color
   ever beats a computed one.
   ```ts
   // Copy `base`, then let every VALID hex in `chosen` win. A role that's missing — or
   // holding junk — keeps the formula's value. That is also how "un-pin this role" is
   // expressed: delete the key. Never send '' or null; there is no third state.
   export function overrideRoles<T extends object>(base: T, chosen?: Partial<T>): T {
     if (!chosen) return base;
     const accepted: Record<string, Hex> = {};
     for (const [role, value] of Object.entries(chosen)) {
       if (isHex(value)) accepted[role] = value;
     }
     // Shape-preserving by construction: every key came from `chosen`, which is a Partial<T>.
     return { ...base, ...accepted } as T;
   }
   ```
5. **Add `countOverrides`** last. The panel shows a **`N pinned`** badge (step 06) and disables **Clear all** when
   `N` is 0; putting the count here rather than in the webview means the *definition* of "pinned" — a valid hex,
   in any of the three groups — lives with the merge that honours it.
   ```ts
   // How many roles the reader has actually pinned, across all three groups.
   export function countOverrides(overrides?: ThemeOverrides): number {
     if (!overrides) return 0;
     const roles: unknown[] = [
       ...Object.values(overrides.palette ?? {}),
       ...Object.values(overrides.tokens ?? {}),
       ...Object.values(overrides.semantic ?? {}),
     ];
     return roles.filter(isHex).length;
   }
   ```
6. Save and run `npm run compile` — it must be clean before the check below can run.

**Load-bearing:** the regular expression `^#[0-9a-f]{6}$` (loosen it to accept `#rgb` or `#rrggbbaa` and
`<input type="color">` in step 06 will silently refuse the value); the exported names `isHex`, `overrideRoles`,
`countOverrides` (imported by steps 03, 06 and 09). The file **path** `src/engine/overrides.ts` is load-bearing for
the `node -e` check and the imports. Everything else — comment wording, the `HEX_6` constant name — is cosmetic.

## Done when (this step)
- `src/engine/overrides.ts` exists with the three exported functions and `npm run compile` is clean.
- The engine is pure, so this is verifiable **without F5**. From the project root:
  ```powershell
  npm run compile
  node -e "const {isHex,overrideRoles,countOverrides}=require('./out/engine/overrides.js');console.log('guard:',isHex('#0a0f1e'),isHex('#0A0F1E'),isHex('banana'),isHex('#0a0f1'),isHex(undefined));console.log('merge:',overrideRoles({bg:'#111111',text:'#eeeeee'},{bg:'#0a0f1e',text:'banana'}));console.log('undefined-safe:',overrideRoles({bg:'#111111'},{bg:undefined}));console.log('count:',countOverrides({palette:{bg:'#0a0f1e'},tokens:{keywords:'#ff0088'},semantic:{}}))"
  ```
  **Expected, exactly:**
  ```
  guard: true true false false false
  merge: { bg: '#0a0f1e', text: '#eeeeee' }
  undefined-safe: { bg: '#111111' }
  count: 2
  ```
  Read the middle two lines carefully — they are the two behaviours the whole milestone rests on. `bg` took the
  pinned color; `text` kept the formula's `#eeeeee` because `banana` isn't a color; and an explicit `undefined`
  did **not** erase `#111111` the way a bare spread would have.

## If it breaks
- **`undefined-safe:` prints `{ bg: undefined }`** → you merged with `{ ...base, ...chosen }` instead of filtering
  into `accepted` first. That's the exact trap in the warning above: re-read point 4 and filter by `isHex`.
- **`guard:` prints `true` for `banana`** → the regex lost its anchors. Without `^` and `$`, `.test` matches a hex
  *somewhere inside* the string. Both anchors are required.
- **`Cannot find module './out/engine/overrides.js'`** → `npm run compile` didn't run or failed; run it first and
  confirm `out/engine/overrides.js` exists.
- **`Type 'Record<string, Hex>' is not assignable to type 'T'`** → the `as T` on the return line is missing. It's
  in the code above for this reason.
- **`Object.entries` complains about `chosen`** → you typed the parameter as `T` rather than `Partial<T>`. A patch
  is *some* of `T`, never all of it.

---
> Nav: [← The `ThemeOverrides` type](01_types-overrides.md) · [Overview](00_overview.md) · [Thread them through `generate()` →](03_generate-overrides.md)
