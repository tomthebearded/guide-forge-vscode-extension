# Milestone M5 — Tokens and persistence
> Core · milestone 5 of 7 · prev: [M4](../MILESTONE_4_gallery-and-ux/00_overview.md) · next: [M6](../MILESTONE_6_per-role-color-editing/00_overview.md) · start: [Extend the engine types](01_types-extend.md)

## Goal
M4 recolored the **chrome** (the editor's surrounding UI); M5 makes the extension recolor **the code itself** —
syntax tokens (keywords, strings, comments) and semantic tokens (types, functions, variables) — then adds the
features that make it a real tool: **Save** a creation as a named **custom set**, **export/import** sets as JSON,
and **scope** a set's token colors to a single language.

**Observable end state:** in the Extension Development Host, pick a combo + style → the code in your open files
recolors live (keywords/strings/comments/types), not just the chrome. Type a name and click **Save set…** → it
appears under **My sets** and is still there after you reload the window. **Export** opens a JSON document you can
save to disk; **Import** reads it back and merges. Type `typescript` into the language box and apply → only `.ts`
token colors change, the chrome stays as it was.

## Scope discipline (what this milestone deliberately does NOT do)
- **No hand-picked colors.** Every color here is *derived* by the formula from the combo + style. Editing an
  individual role by hand is **M6**.
- **No packaging.** No `publisher` field, no `.vsix` — that's **M7**. `package.json` is untouched this whole
  milestone.
- **No Marketplace publishing.** Even in M7, packaging a local `.vsix` is the finish line; `vsce publish`
  (accounts, tokens, the public gallery) is out of scope. → [PLAN.md](../PLAN.md) scope boundaries.
- **No icon or product-icon themes.** We recolor text and chrome only, never the file-type or UI glyphs.
- **No settings-JSON editor UI.** We write settings through our one code path; we don't build a JSON form.
- **No multi-window / settings-sync handling.** `globalState` persistence is per-installation; we don't reason
  about two windows fighting over it.
- **Per-language scoping is tokens-only — on purpose.** `workbench.colorCustomizations` (chrome) is **not**
  language-overridable by VS Code; only `editor.*` (tokens) is. We implement tokens-only scoping and *teach why*
  in step 03. → [decision-log.md D2](../foundation/decision-log.md#d2--per-language-scoping-is-tokens-only).

## Prerequisite
**M4 green.** You have the externalized webview (`media/webview/main.js` + `styles.css`), the full 13-profile
gallery with swatch preview + contrast readout, and chrome recoloring live through the `applyChrome` → history
path. If M4's Done-when gate doesn't pass, fix that first — M5 edits those exact files.

## Load-bearing names (must match exactly, everywhere)
| Name | Value | What breaks if it drifts |
|------|-------|--------------------------|
| Token setting id | `editor.tokenColorCustomizations` | syntax tokens never recolor |
| Semantic setting id | `editor.semanticTokenColorCustomizations` | semantic tokens never recolor |
| globalState key | `vanCode.savedSets` | saved sets don't persist / can't be read back |
| Message types | `save`, `applySet`, `delete`, `export`, `import` (+ `languageId` on `apply`) | webview buttons do nothing |
| Language-override 4th arg | `update(key, value, Global, true)` | scoping writes globally instead of per-language |

*(Cosmetic — rename freely: the set-name text, the button labels, the JSON display.)*

## Steps at a glance (grouped into sittings)
**Sitting 1 — Extend the engine to emit tokens (01–02)** — pure, `vscode`-free, unit-testable.
1. [Extend the engine types — `TokenColors`, `SemanticColors`, `ThemeResult`](01_types-extend.md)
2. [Widen `ThemeResult` and generate token + semantic colors](02_generate-extend.md)

**Sitting 2 — Write tokens through the one path + per-language (03–04)**
3. [Apply tokens + semantic, and scope tokens per language](03_apply-extend.md)
4. [History captures all three settings](04_history-extend.md)

**Sitting 3 — Persistence + import/export (05–08)**
5. [Save named sets with `globalState`](05_storage.md)
6. [The final provider — wire save / applySet / delete / import / export](06_provider-final.md)
7. [The final webview — language box, Save/Export/Import, My sets](07_main-js-final.md)
8. [Export / import round-trip (walkthrough)](08_export-import.md)

**Verify**
9. [Milestone verification + file checkpoint](09_verify.md)

## Design / decisions folded in
- **Tokens go through the same one write path.** `applyTheme` in `src/theme/apply.ts` writes chrome + tokens +
  semantic; nothing writes those settings ad hoc. The snapshot backbone (M2) now captures all three, so Revert
  and Reset still undo *everything*. → [conventions.md](../foundation/conventions.md#structure--architecture)
- **Chrome vs. editor settings decides what can be language-scoped.** This is the mental model M5 makes concrete:
  `editor.*` accepts a `"[languageId]"` override; `workbench.*` does not. → [decision-log.md D2](../foundation/decision-log.md#d2--per-language-scoping-is-tokens-only)
- **Semantic tokens can silently do nothing.** They only take effect when a language server supplies semantic
  tokens *and* the active theme opts in. We set `enabled: true` and flag the "it looks broken but isn't" trap
  loudly in steps 03 and 09. → [decision-log.md](../foundation/decision-log.md) (risk 3).
- **Persistence uses `globalState`, not settings.** Saved sets are extension data, not user color settings, so
  they live in the extension's `Memento` — invisible to the user's `settings.json`, surviving reloads.

## Done-when gate (aggregated — the real test)
- [ ] Applying a set recolors **keywords/strings/comments/types** in an open file, live. → steps 02–03, 09
- [ ] Semantic recoloring is wired (`enabled: true`); you understand it may *look* like nothing on files with no
      language server. → steps 03, 09
- [ ] Revert/Reset still undo everything, now including token + semantic settings. → step 04
- [ ] **Save set…** with a name → it appears under **My sets** and **survives a window reload**. → steps 05–07, 09
- [ ] **Export** opens a JSON doc; saving it and **Import**ing it back round-trips (My sets merged/unchanged). → step 08, 09
- [ ] Typing `typescript` in the language box + apply changes **only `.ts`** token colors; chrome unchanged. → steps 03, 07, 09

## Handoff
### Recap
You extended the pure engine to emit token + semantic colors, wrote them through the same non-destructive path
(now snapshotting all three settings), added `globalState`-backed named sets with JSON import/export, and taught
the tokens-only language-scoping limit.

### Done so far (cumulative)
- A runnable VS Code extension `van-code` with a sidebar Webview panel and two-way messaging (M1).
- A non-destructive backbone: snapshot-before-write, Revert, Reset (M2).
- A pure color engine: hex↔HSL math, WCAG contrast, 5 combos, 9 generative + 4 signature profiles (M3–M4).
- An externalized gallery UI with swatch preview + contrast readout, full chrome recoloring live (M4).
- **New in M5:** syntax + semantic token recoloring, saved sets via `globalState`, JSON import/export, and
  per-language token scoping.

### Artifacts now in the project
- Extended: `src/engine/types.ts`, `src/engine/generate.ts`, `src/theme/apply.ts`, `src/theme/history.ts`,
  `src/panel/ThemePanelProvider.ts`, `src/extension.ts`, `media/webview/main.js`.
- New: `src/storage/sets.ts`.
- Untouched: `package.json` (M7 is the only milestone that edits it after M1).

### Decisions / open issues
- Language scoping is tokens-only by VS Code's design (D2) — chrome stays global; this is taught, not a bug.
- Semantic recoloring depends on the open file's language server; on a plain file it may appear inert.
- The status bar still keeps its debug-orange under <kbd>F5</kbd> (D7). That closes in M7, after `.vsix` install.
- Everything is still formula-derived: there is no way to overrule a single color. That's exactly what M6 adds.

### Next
**[M6 — Per-role color editing](../MILESTONE_6_per-role-color-editing/00_overview.md)** — a picker for each of the
28 roles the engine emits, layered over the formula.

---
> Core · milestone 5 of 7 · prev: [M4](../MILESTONE_4_gallery-and-ux/00_overview.md) · next: [M6](../MILESTONE_6_per-role-color-editing/00_overview.md) · start: [Extend the engine types](01_types-extend.md)
