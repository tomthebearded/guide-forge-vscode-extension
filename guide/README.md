# Van Code — build a VS Code extension that live-recolors the entire editor

> The front door to this guide. Skim this, then follow the milestones. **Progress lives in
> [foundation/status.md](foundation/status.md), not here** — this page describes intent; `status.md` states reality.

> _Generated with **GuideForge v1.2.0**._

## Objective
You'll build a VS Code extension (TypeScript) with a **sidebar panel in the Activity Bar** that generates and
instantly applies a full editor color theme — **workbench chrome *and* syntax/semantic tokens** — from a
*starter color combination* plus a *visual style preset*. Every apply is **live** (no reload) and
**non-destructive** (a snapshot is taken before every write; Revert steps back, Reset removes everything).
"Done" is observable: press <kbd>F5</kbd>, open the panel, pick a combo + style, and watch the whole editor
recolor live — then **hand-pick any of the 28 individual roles** the formula produced, Save the result, export/import
it as JSON, scope its token colors per language, and Revert or Reset. The finish line is a packaged **`.vsix`**.

## Stack (summary)
TypeScript 5.9 · VS Code engine `^1.128.0` (`@types/vscode ^1.128.0`) · Node 24 LTS · packaged with `@vscode/vsce` —
full verified table + official docs + check date: **[foundation/stack.md](foundation/stack.md)**.

## Key decisions
- **Non-destructive backbone, introduced small (M2).** The extension writes to your *real* `settings.json`, so
  snapshot-before-every-write is the whole safety story. → [foundation/decision-log.md](foundation/decision-log.md#d1--non-destructive-backbone-is-load-bearing)
- **One write path + a pure engine.** All settings writes funnel through one module; the color math lives in a
  `vscode`-free engine so it's unit-testable. → [foundation/decision-log.md](foundation/decision-log.md#d3--two-layer-architecture-pure-engine--thin-adapter)
- **Per-language scoping is tokens-only.** `workbench.colorCustomizations` can't be language-scoped — a hard API
  limit we teach rather than hide. → [foundation/decision-log.md](foundation/decision-log.md#d2--per-language-scoping-is-tokens-only)
- **All 13 styles taught in full**, via a data-driven `StyleProfile` registry (9 generative + 4 signature). →
  [foundation/decision-log.md](foundation/decision-log.md#d4--all-13-styles-taught-in-full-data-driven)
- **Hand-picked colors are overrides, at role level.** M6 layers a sparse `role → hex` map over the formula rather
  than replacing it — 28 roles, not 600 VS Code keys — and commits on `change` so one edit is still one snapshot. →
  [D9](foundation/decision-log.md#d9--overrides-are-role-level-not-vs-code-key-level) ·
  [D10](foundation/decision-log.md#d10--role-edits-commit-on-change-not-on-input)

## Updates
- 2026-08-09 — **Confirmation re-audit (M1–M7) → PASS-WITH-WARNINGS; all findings fixed.** Structure is mechanically clean (0 dead links, 0 dead glossary/decision anchors, 0 nav defects, consistent step counts and pinned versions), so every fix was a content one. Two fixes the previous pass *claimed* had not landed and now have: M6's third-person→"you" voice pass (11 survivors, including both in-code comments) and M3/06's `p.surfaceAlt` D8 leftover. Also: M4's handoff still sent packaging to M5 (now M7); M6/02 promised "three exported functions" where there are two; `ThemeHistory.depth` and `color.ts`'s `rotate` are now honestly marked `[unused]` / `[M5]` instead of reading as missing call sites; `conventions.md`'s naming rule is scoped to `src/engine/*` with the adapter carve-out spelled out; D7's pointers to the deleted `M5/10` now point at M7/02; `renderPreview()` is byte-identical across the M4/M5/M6 checkpoints; and M5/08 now performs the re-import its idempotency check asserts. **Doc-only — nothing about the build changed.** Two suspects stay open for `/review-before-follow` against a real EDH: the sandboxed `<input type="color">` dialog, and whether `editor.semanticTokenColorCustomizations` is truly language-overridable (M5/09 check 5 depends on it).
- 2026-08-09 — **Whole-guide audit + fixes.** `/audit-guide` over M1–M7 returned FAIL; every finding is fixed. The structural ones: three steps ended on a build that didn't compile (M2/04, M4/04, M5/01) — each now closes green, which merged M4's step 05 into step 04 (**M4 is 4 steps + verify; `06_verify.md` is now `05_verify.md`**) — and M6 shipped an exported function nothing called (`countOverrides`, removed). Also: a wrong dev-tools pointer, an inaccurate load-bearing claim, the missing `start:` nav segment on all 7 overviews, second-person voice restored in M6, and assorted stale milestone references. One **open suspect** stays: whether a sandboxed webview surfaces the OS color dialog for `<input type="color">` — the hex box is documented as the fallback either way.
- 2026-08-09 — **New milestone: M6 — Per-role color editing**, and the ladder grew to **7**. The reader can now
  hand-pick every one of the 28 roles the engine emits (8 chrome + 7 syntax + 13 semantic) via a picker layered over
  the formula. M5 is now **Tokens and persistence** (`MILESTONE_5_tokens-and-persistence/`, 9 steps) and packaging
  moved out into **M7** (`MILESTONE_7_packaging/`, 2 steps) so the shipped `.vsix` includes the new feature. New
  decisions [D9](foundation/decision-log.md#d9--overrides-are-role-level-not-vs-code-key-level) and
  [D10](foundation/decision-log.md#d10--role-edits-commit-on-change-not-on-input); new glossary terms *role
  override* and *effective color*. M5–M7 need F5 verification.
- 2026-08-07 — fixed: the demo color was invisible under <kbd>F5</kbd> — the EDH is a debugged window, so `statusBar.debugging*` overrode it. M2's demo now applies both status-bar pairs (4 keys); M3/M4 gates no longer claim the status bar recolors under F5, and M5/10 closes the loop after install (M2/05, M2/06, M2/00, M2/02 + M3/06, M3/07, M3/08, M3/00, M4/06, M5/10; M2–M5 flagged for re-verify).
- 2026-08-04 — Renamed the extension to **Van Code** (identifier `van-code`): display names, package `name`, project folder, view container/view ids (`vanCode`, `vanCode.panel`), `globalState` key (`vanCode.savedSets`), notification strings and the emitted `van-code-0.0.1.vsix` all updated across every milestone. Doc-only rename — no behavior change.
- 2026-07-21 — Retrofitted to the GuideForge v1.2.0 pedagogy contract: provenance stamp, glossary hygiene (concept headings + deep-links, `acquireVsCodeApi()`→inline comment), code interleaved under its instruction (4.2), existing-file edits shown as fragments (4.3), and "Before you start" starting-state notes (7.1). All milestones flagged for re-verify.
- 2026-07-13 — fixed: webview double-apply — `render()` no longer calls `apply()`, so each pick makes exactly one history snapshot (M4/03, M5/07 + verifies; M4/M5 flagged for re-verify).
- 2026-07-10 — M2–M5 drafted in one pass (against a locked code spec). Whole guide now drafted; audit + F5 hand-verification pending.
- 2026-07-10 — M1 (Scaffold + sidebar panel) drafted — 10 steps + verify; awaiting F5 hand-verification.
- 2026-07-10 — Guide created (plan approved, skeleton scaffolded).

## Following this guide
1. Read **[foundation/status.md](foundation/status.md)** first — the single source of truth for what's done and verified.
2. Start at **[Milestone 1](MILESTONE_1_scaffold-sidebar/00_overview.md)**; do the milestones in order (each builds on the last).
3. **Type the code — don't paste it.** The complete files are included so you always have an authoritative copy
   to diff against, *not* so you can paste blindly. You'll learn far more by typing each file, reading it as you
   go, and predicting a step's expected output *before* you run it. Reach for paste only to unstick yourself.
4. If you're following this a while after it was written, run the **review-before-follow** gate first — re-check
   the stack's "Latest stable" column and reconcile any drift before executing (reality wins).
