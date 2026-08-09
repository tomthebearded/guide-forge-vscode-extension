# M6 · Step 07 of 10 — Extend the editor to the 7 token roles + 13 semantic types
> Nav: [← Edit the 8 chrome roles](06_webview-chrome-editor.md) · [Overview](00_overview.md) · [Un-pin and clear all →](08_clear-and-revert.md)

## Why / design
Step 06 built the machinery for a group of roles. This step adds the other two groups — and it is deliberately
tiny, because `renderRoles`, `roleRow` and `setRole` were written against a *group key*, never against the palette
specifically. Adding 20 more pickers is **two entries in an array**, plus one line so a group can arrive collapsed.

That's the point worth pausing on: `roleRow(group, name)` reads `state.overrides[group][name]` and
`state.effective[group][name]`, and `setRole` writes back to the same address. Both are pure address arithmetic on
strings the extension chose. Neither knows what a "semantic token type" is, and neither will need editing if the
engine ever emits a fourth group — *new data, not new control flow*
(→ [conventions.md](../foundation/conventions.md#data-vs-code)).

**Why the semantic group is collapsed and the other two aren't.** 28 rows in one scroll is a wall. The 15 roles in
the first two groups are the ones you tune constantly; the 13 semantic types are mostly *derived from* the
token roles above them (M5's `paletteToSemantic` fans 7 colors out to 13 types, so `class`/`type`/`interface`/`enum`
all start out identical) and are only worth opening when you specifically want types to differ from the TextMate
color underneath. `<details>` (step 05) makes that a one-click, zero-state affair.

> ⚠️ **A pinned semantic type can look completely inert — and usually isn't a bug.** This is M5's semantic trap,
> now reachable through a picker. `editor.semanticTokenColorCustomizations` only paints when the open file's
> language has a running **semantic-tokens provider** *and* the color differs visibly from the TextMate color
> beneath it. Pin `parameter` to hot pink on a `.txt` file and nothing whatsoever happens; do it on a `.ts` file and
> the parameters turn pink a moment after the TypeScript server tokenizes. Test semantic pins on a `.ts` file, or
> you'll be debugging a feature that's working.
> → [M5/09 gate](../MILESTONE_5_tokens-and-persistence/09_verify.md), the semantic-tokens trap note.

> 📌 **Where the two token groups interact.** Pinning `keywords` (a *token* role) also moves the semantic `keyword`
> type, because [step 03](03_generate-overrides.md)'s merge ② runs before `paletteToSemantic` fans the tokens out.
> Pinning the semantic `keyword` type as well wins over that, because merge ③ runs last. So: edit the token role to
> move both together, and reach into the semantic group only when you want them to *disagree*.

## Do this
This step edits **one file**: `media/webview/main.js`, in **two places** — the `GROUPS` array and one line inside
`renderRoles()`. Nothing else changes; `roleRow` and `setRole` are not touched. (The complete file is in
[the M6 checkpoint](10_verify.md) under `### media/webview/main.js`.)

> **Before you start:** step 06's gate must pass — 8 working chrome-role pickers in the panel. If those don't
> apply yet, fix that first; this step adds rows to a mechanism that already works.

1. Open `media/webview/main.js` and find the `GROUPS` array you added in step 06.
2. **Replace it with all three groups.** The `collapsed` flag exists only on the third:
   ```js
   const GROUPS = [
     { key: 'palette',  title: 'Fine-tune — chrome roles' },
     { key: 'tokens',   title: 'Fine-tune — syntax token roles' },
     { key: 'semantic', title: 'Semantic token types', collapsed: true },
   ];
   ```
   The **order** is the display order, and it's the derivation order from step 03 (palette → tokens → semantic) on
   purpose: the panel reads top-to-bottom the way the colors are computed.
3. **Teach `renderRoles()` about `collapsed`.** Inside the `for (const group of GROUPS)` loop, replace the single
   line `box.append(section(group.title, grid));` with:
   ```js
       box.append(group.collapsed
         ? el('details', {}, el('summary', { textContent: group.title }), grid)
         : section(group.title, grid));
   ```
   `section()` (M4) renders an `<h4>` above the body; `<details>`/`<summary>` (step 05) renders a click-to-open
   line instead. Same `grid` either way — only the wrapper differs.
4. Save. Again no compile: this is the webview's plain JavaScript.

**Load-bearing:** the group **keys** `palette`, `tokens`, `semantic` — they must match the fields the provider
sends on `applied` (step 04) and the fields `ThemeOverrides` declares (step 01), because they're used as object
addresses on both sides. The `title` strings, the display order and `collapsed` are cosmetic.

## Done when (this step)
Press <kbd>F5</kbd>, open the panel and open a **`.ts` file** in the Extension Development Host (you need a
language server for the last check).
- Fine-tune now shows **8 + 7 = 15 visible rows** in two titled groups, plus a collapsed **Semantic token types**
  line. Click it → **13 more rows** appear (`variable`, `parameter`, `property`, `function`, `method`, `class`,
  `type`, `interface`, `enum`, `keyword`, `string`, `number`, `comment`). **28 pickers total.**
- Pin **`comments`** (syntax group) to something loud → the comments in your open file recolor on release, and the
  chrome does **not** move. Pin **`strings`** → string literals follow.
- Pin the token role **`keywords`** to `#ff0088` → keywords recolor. Now open the semantic group: the `keyword`
  row's swatch **already shows `#ff0088`** — it inherited your pin through merge ②, without you touching it.
- Pin the semantic `keyword` type to `#00ffaa` → in the `.ts` file the keywords go green (merge ③ wins) while the
  syntax group still reads `#ff0088`. Un-pin it with ↺ → back to pink.
- Every pinned row is bold with a solid ↺; unpinned rows stay ghosted.

## If it breaks
- **The two new groups don't appear** → `state.effective.tokens` / `.semantic` are empty, which means step 04's
  provider isn't sending them. `renderRoles` skips a group with no keys on purpose (`if (!names.length) continue`).
- **The semantic group renders open, or as a plain heading** → point 3's ternary wasn't applied, or `collapsed`
  is set on the wrong entry.
- **Nothing at all happens when you pin a semantic type** → check the file type first. On anything without a
  language server this is the expected, documented behaviour — see the warning above, and re-test on `.ts`.
- **A semantic pin works but the syntax color "wins" visually** → they're layered: TextMate paints, semantic paints
  over it *where the provider labelled a token*. Identifiers not covered by a semantic type keep the TextMate
  color. That's VS Code's model, not a bug in your merge.
- **`el('details', {}, …)` renders nothing** → `el` assigns props with `Object.assign` and appends the remaining
  arguments as children (M4 step 03); the empty `{}` for props is required, since the children are the 3rd argument
  onward.

---
> Nav: [← Edit the 8 chrome roles](06_webview-chrome-editor.md) · [Overview](00_overview.md) · [Un-pin and clear all →](08_clear-and-revert.md)
