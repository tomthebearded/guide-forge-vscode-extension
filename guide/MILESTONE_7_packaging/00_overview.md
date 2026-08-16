# Milestone M7 — Packaging
> Core · milestone 7 of 7 · prev: [M6](../MILESTONE_6_per-role-color-editing/00_overview.md) · next: — · start: [Add `publisher` and package the `.vsix`](01_package.md)

## Goal
Turn the project you've been running with <kbd>F5</kbd> into a **`.vsix`** — one installable file containing the
compiled extension — and install it into an ordinary VS Code window. Two steps, one manifest field, one command.

It's short on purpose. Everything that *makes* packaging trap-free was decided milestones ago: the webview assets
live under `media/` (M4 step 02) so `.vscodeignore` keeps them, the engine is plain TypeScript that `tsc` emits to
`out/`, and `vscode:prepublish` already runs the compile. The only thing missing is a `publisher` id, which `vsce`
refuses to work without.

Installing the result also settles something the guide has owed you since M3: the **status-bar exception**. Under
<kbd>F5</kbd> the Extension Development Host is a *debugged* window, so VS Code paints its status bar from
`statusBar.debuggingBackground` and every generated theme has appeared to skip that one surface
([D7](../foundation/decision-log.md#d7--m2s-demo-sets-the-status-bar-debugging-colors-the-m3-engine-map-does-not)).
In an ordinary window there is no debug session, so the status bar recolors with everything else — the proof is
check 3 of the gate.

**Observable end state:** `vsce package` prints a line ending in `van-code-0.0.1.vsix`, the file is in the project
root, and installing it gives you the Van Code panel in a normal window where combos, styles, the 28 role pickers,
saved sets, Revert and Reset all work — status bar included.

## Scope discipline (what this milestone deliberately does NOT do)
- **No Marketplace publishing.** `vsce publish` needs a registered publisher and a personal access token; the local
  `.vsix` is the finish line. → [PLAN.md](../PLAN.md) scope boundaries.
- **No bundling / minification.** No esbuild, no webpack. `tsc` output is what ships; the extension is small and
  the guide is about color, not build pipelines.
- **No icon, README polish, or CHANGELOG for the Marketplace listing.** Those matter when you publish, which we
  don't.
- **No new features.** Not a line of `src/engine/`, `src/theme/`, `src/panel/` or `media/` changes in M7.
  `package.json` is the only file edited, and only by two fields.

## Prerequisite
**M6 green.** Its [gate](../MILESTONE_6_per-role-color-editing/10_verify.md) passes and — critically —
`npm run compile` is **clean**. `vsce package` runs `vscode:prepublish` (→ `npm run compile`) first and aborts on
any TypeScript error, so a red compile is a failed package, not a warning.

## Load-bearing names (must match exactly, everywhere)
| Name | Value | What breaks if it drifts |
|------|-------|--------------------------|
| `publisher` **presence** | any lowercase id (we use `example`) | `vsce package` **errors**: `ERROR Missing publisher name` |
| `.vsix` filename | `van-code-0.0.1.vsix` | derived from `name` + `version` (both fixed since M1); the gate checks it |
| Webview asset path | `media/webview/…` | assets under `src/` are stripped by `.vscodeignore` → a blank panel in the installed extension |

*(Cosmetic — rename freely: the `publisher` value itself, the `repository` URL.)*

## Steps at a glance
1. [Add `publisher` and package the `.vsix`](01_package.md)

**Verify**
2. [Install it, close the status-bar exception, and you're done](02_verify.md)

## Design / decisions folded in
- **Packaging is a milestone, not a footnote.** It was M5's last step until the guide grew M6; splitting it out
  keeps "ship it" as its own observable gate instead of an afterthought bolted to a feature milestone.
- **The `publisher` value is arbitrary because we're not publishing.** Its *presence* is what `vsce` enforces. The
  step says which half is load-bearing so nobody goes hunting for a real publisher account.
- **Install to prove it, not just to package it.** A `.vsix` that builds but ships a blank panel (the classic
  `src/`-vs-`media/` mistake) passes a naive "did it emit a file?" check. The gate installs and *uses* it.

## Done-when gate (aggregated — the real test)
- [ ] `package.json` has a `publisher` and everything else is unchanged since M1. → step 01
- [ ] `vsce package` completes with no errors and emits **`van-code-0.0.1.vsix`** in the project root. → steps 01, 02
- [ ] Installing the `.vsix` in an ordinary window gives a working Van Code panel — chips, 28 pickers, My sets,
      Revert, Reset. → step 02
- [ ] In that ordinary window the **status bar recolors** with the rest of the theme, closing the exception open
      since M3. → step 02

## Handoff
### Recap
One manifest field, one command, one install — and seven milestones of work becomes a file you can hand to someone.

### Done so far (cumulative)
- **M1** — a real extension with an Activity-Bar icon, a Webview sidebar panel, and two-way messaging.
- **M2** — a non-destructive backbone: snapshot-before-write, Revert, Reset — one write path, always reversible.
- **M3** — a pure, `vscode`-free color engine: hex↔HSL math, WCAG contrast, 5 starter combos, 9 generative profiles.
- **M4** — an externalized gallery UI (13 profiles incl. 4 signature presets) with swatch preview and a WCAG
  contrast readout — the reality-check gate.
- **M5** — syntax + semantic token recoloring, saved sets in `globalState`, JSON import/export, per-language token
  scoping (its mechanism corrected in M6 — the language rides **inside** the setting value).
- **M6** — per-role overrides: a picker for each of the 28 roles, layered over the formula and saved with the set.
- **M7** — a packaged, installable `van-code-0.0.1.vsix`.

### Artifacts now in the project
- Modified: `package.json` (`publisher` + `repository`).
- Emitted: `van-code-0.0.1.vsix`.

### You're done
Once the gate in **[step 02](02_verify.md)** passes, the build is complete — head back to the
**[guide front door](../README.md)** for the closing recap.

---
> Core · milestone 7 of 7 · prev: [M6](../MILESTONE_6_per-role-color-editing/00_overview.md) · next: — · start: [Add `publisher` and package the `.vsix`](01_package.md)
