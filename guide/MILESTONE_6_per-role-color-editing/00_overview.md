# Milestone M6 — Per-role color editing
> Core · milestone 6 of 7 · prev: [M5](../MILESTONE_5_tokens-and-persistence/00_overview.md) · next: [M7](../MILESTONE_7_packaging/00_overview.md) · start: [Add the `ThemeOverrides` type](01_types-overrides.md)

## Goal
Through M5 every color in the editor was *computed*: you picked a starter combo and a style, and the formula
decided the other 28 values. It's a good formula — but it's not *your* formula. If Deep Sea + Neon gets everything
right except a background that's one notch too blue, your only move today is to abandon the whole preset.

M6 gives you a **color picker for every role the engine emits** — all **28** of them: the **8 palette
roles** (`bg`, `surface`, `surfaceAlt`, `text`, `textMuted`, `accent1`, `accent2`, `border`), the **7 syntax-token
roles** (`comments`, `keywords`, `strings`, `numbers`, `types`, `functions`, `variables`) and the **13 semantic
token types** (`variable`, `parameter`, `property`, `function`, `method`, `class`, `type`, `interface`, `enum`,
`keyword`, `string`, `number`, `comment`).

The design idea that makes this small instead of sprawling: an edited color is **not** a replacement theme, it's an
**override** — a sparse `role → hex` map layered *over* whatever the formula produced. Pin `bg` to your favourite
navy and every style you click afterwards keeps that navy and re-derives everything else around it. Un-pin it and
the formula takes the role back. The engine gains **one** new module and **one** new parameter; no profile, no
apply path and no history code changes at all.

**Observable end state:** in the Extension Development Host the panel grows a **Fine-tune** section listing every
role with a swatch, a `#rrggbb` box and a ↺ button. Drag `bg`'s picker → the editor background follows the moment
you release the mouse, the contrast badge recomputes, and the chrome keys that derive from `bg` (tabs, sidebar,
panel) move with it. The footer badge reads **`3 pinned`**. Click a different style → your 3 pinned roles stay, the other
25 change. Click ↺ on one → that role snaps back to the formula. **Revert** still steps back one pick at a time,
**Reset** still removes everything, and a **saved set now remembers its overrides**, so re-applying it puts the
pickers back exactly where you left them.

## Scope discipline (what this milestone deliberately does NOT do)
- **No raw VS Code color keys.** You edit the **8 palette roles**, not the 20 `workbench.colorCustomizations` keys
  they expand into. Editing `bg` moves every chrome key derived from `bg` *together* — that's the point of a role.
  A per-key editor over VS Code's ~600 theme colors is the "settings-JSON editor UI" the plan rules out.
  → [PLAN.md](../PLAN.md) scope boundaries, [decision-log.md D9](../foundation/decision-log.md#d9--overrides-are-role-level-not-vs-code-key-level).
- **No new profiles and no changed profiles.** `profiles.ts` is untouched. Overrides sit *outside* the 13 styles.
- **No color-harmony assistance.** We don't stop you picking an unreadable pair; we only *show* the WCAG ratio you
  already had from M4. Contrast clamping stays where M5 put it — inside token derivation, before your override.
- **No undo stack of its own.** Each committed edit is one ordinary apply, so it lands in M2's existing history.
  Revert steps back through edits and preset picks in the same single stack.
- **No packaging.** The `.vsix` is **M7**; `package.json` is still untouched.

## Prerequisite
**M5 green.** Steps 01–08 of M5 are done and its [gate](../MILESTONE_5_tokens-and-persistence/09_verify.md) passes:
tokens and semantic colors apply live, Revert/Reset undo all three settings, saved sets survive a reload, and
export/import round-trips. M6 edits `src/engine/types.ts`, `src/engine/generate.ts`, `src/storage/sets.ts`,
`src/panel/ThemePanelProvider.ts`, `media/webview/styles.css` and `media/webview/main.js` — all of which must be at
their M5 state before you start.

## Load-bearing names (must match exactly, everywhere)
| Name | Value | What breaks if it drifts |
|------|-------|--------------------------|
| Override group keys | `palette`, `tokens`, `semantic` | the webview writes a group the engine never reads → edits do nothing |
| Role keys | the `Palette` / `TokenColors` field names and the 13 semantic type names | a misspelled role is merged in as a **new** key: harmless for `palette`/`tokens` (nothing reads it) but for `semantic` it reaches VS Code's `rules` object |
| Hex shape | `#rrggbb`, 7 chars, lowercase or upper | `isHex` rejects anything else, so the edit is dropped on purpose |
| New message type | `restore` (provider → webview) | applying a saved set won't repopulate the pickers |
| `overrides` field on `apply` | `{ palette, tokens, semantic }` | the provider generates an un-overridden theme |
| `SavedSet.overrides` | the field name in `globalState` / exported JSON | old sets still apply, but re-open with empty pickers |

*(Cosmetic — rename freely: the "Fine-tune" heading, the ↺ glyph, the `pinned` badge wording, every CSS class.)*

## Steps at a glance (grouped into sittings)
**Sitting 1 — Teach the engine to accept a hand-picked color (01–03)** — pure, `vscode`-free, Node-checkable.
1. [Add the `ThemeOverrides` type](01_types-overrides.md)
2. [`src/engine/overrides.ts` — validate a hex, merge a sparse patch](02_overrides-module.md)
3. [Thread overrides through `generate()`](03_generate-overrides.md)

**Sitting 2 — Carry them across the boundary (04)**
4. [The provider passes overrides through and echoes the effective colors back](04_provider-overrides.md)

**Sitting 3 — Build the editor (05–08)**
5. [Style the role rows](05_styles-editor.md)
6. [The webview holds overrides + effective colors, and edits the 8 chrome roles](06_webview-chrome-editor.md)
7. [Extend the editor to the 7 token roles + 13 semantic types](07_webview-token-editor.md)
8. [Un-pin one role, clear them all, and how this meets Revert/Reset](08_clear-and-revert.md)

**Sitting 4 — Make them survive (09)**
9. [Saved sets remember their overrides](09_persist-overrides.md)

**Verify**
10. [Milestone verification + file checkpoint](10_verify.md)

## Design / decisions folded in
- **Overrides are role-level, not key-level.** You edit the 8 semantic *roles* the palette is made of, and
  `paletteToChrome` re-derives all 20 workbench keys from the edited palette. One picker moves a coordinated group
  of surfaces, which is both less work and better design than 20 unrelated pickers.
  → [decision-log.md D9](../foundation/decision-log.md#d9--overrides-are-role-level-not-vs-code-key-level)
- **One merge point, in `generate()`.** Overrides are applied at exactly three lines inside the existing
  `generate()` — palette before chrome/token derivation, tokens before semantic derivation. Nothing else in the
  codebase learns that overrides exist. This keeps *new data, not new control flow*
  (→ [conventions.md](../foundation/conventions.md#data-vs-code)) and it's why editing `keywords` also moves the
  semantic `keyword` type unless you pin that separately.
- **A missing key means "the formula decides", and that's the only way to say it.** Un-pinning deletes the key; it
  never writes `""` or `null`. `overrideRoles` copies the generated value whenever the patch has no valid hex for a
  role, so "cleared" and "never touched" are the same state — there is no third case to reason about.
- **Commit on `change`, never on `input`.** A native color picker fires `input` continuously while you drag —
  hundreds of events, and under M2's backbone *every apply takes a history snapshot*. Committing only on `change`
  (mouse released / field left) keeps the rule the guide has enforced since M4: **one apply, one snapshot, per
  deliberate action.** → [decision-log.md D10](../foundation/decision-log.md#d10--role-edits-commit-on-change-not-on-input)
- **The engine stays total.** Hex arriving from the webview is untrusted text — you can type `banana` into
  the box. `isHex` gates every value, and an invalid one is dropped rather than thrown. Same reflex as
  `comboById`'s `?? COMBOS[0]` in M3: *give the engine anything, it returns a valid theme.*

## Done-when gate (aggregated — the real test)
- [ ] The **Fine-tune** section lists **28** rows — 8 chrome roles, 7 token roles, 13 semantic types — each with a
      swatch, a hex box and a ↺ button. → steps 06–07, 10
- [ ] Dragging `bg`'s picker recolors the editor **on release** (not during the drag), and the tabs/sidebar/panel
      keys derived from `bg` move with it. → steps 03, 06, 10
- [ ] Typing a valid hex in a role's box applies it; typing junk leaves the color unchanged and marks the box. → step 06, 10
- [ ] The section's footer badge counts pinned roles; picking a different **Style** keeps the pinned ones and
      re-derives the rest. → steps 06–08, 10
- [ ] ↺ on a role returns it to the formula's value; **Clear all overrides** returns every role at once. → step 08, 10
- [ ] **Revert** steps back exactly one edit per click (one snapshot per committed edit); **Reset** still removes
      all three settings. → step 08, 10
- [ ] Saving a set stores its overrides; re-applying it re-fills the pickers and the exported JSON carries an
      `overrides` object. → step 09, 10
- [ ] The engine's `node -e` check shows an overridden `bg` winning and an invalid hex being ignored. → steps 02–03, 10
- [ ] A `typescript`-scoped apply recolors `.ts` only, writes **no** `"[typescript]"` block, and Revert undoes it in
      one click — the per-language mechanism M5 got wrong, repaired here. → step 01 (corrections), 10

## Handoff
### Recap
You added a sparse `ThemeOverrides` map to the pure engine, a two-function `overrides.ts` that validates and merges it,
three lines inside `generate()` that layer it over the formula, one field on the `apply` message, one `restore`
message, and a webview editor that turns all 28 roles into pickers — without touching a single profile, the apply
path, or the history stack.

### Done so far (cumulative)
- A runnable extension with a sidebar Webview panel and two-way messaging (M1).
- A non-destructive backbone: snapshot-before-write, Revert, Reset (M2).
- A pure color engine: hex↔HSL math, WCAG contrast, 5 combos, 13 profiles (M3–M4).
- A gallery UI with swatch preview + contrast readout (M4).
- Syntax + semantic token recoloring, saved sets, JSON import/export, per-language token scoping (M5 — with its
  mechanism corrected at the top of [step 01](01_types-overrides.md)).
- **New in M6:** per-role overrides — a picker for each of the 28 roles, layered over the formula, persisted with
  the set.

### Artifacts now in the project
- New: `src/engine/overrides.ts`.
- Extended: `src/engine/types.ts`, `src/engine/generate.ts`, `src/storage/sets.ts`,
  `src/panel/ThemePanelProvider.ts`, `media/webview/styles.css`, `media/webview/main.js`.
- Untouched: `src/engine/color.ts`, `combos.ts`, `profiles.ts`, `src/theme/*`, `src/extension.ts`, `package.json`.

### Decisions / open issues
- Overrides are keyed by role and survive a style change **by design** — forget that, and a pinned role reads as
  "the style is broken". The `N pinned` badge and step 08's failure note exist for exactly this.
- Semantic overrides only *look* like they do anything on files with a language server (M5's trap, unchanged).
- Overrides ride inside the saved set; a set exported by an older build simply has no `overrides` key and re-opens
  with empty pickers — that's the field being optional, not a migration bug.

### Next
**[M7 — Packaging](../MILESTONE_7_packaging/00_overview.md)** — add `publisher`, build `van-code-0.0.1.vsix`, and
close the status-bar exception that has been open since M3.

---
> Core · milestone 6 of 7 · prev: [M5](../MILESTONE_5_tokens-and-persistence/00_overview.md) · next: [M7](../MILESTONE_7_packaging/00_overview.md) · start: [Add the `ThemeOverrides` type](01_types-overrides.md)
