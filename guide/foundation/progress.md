# PROGRESS — Van Code (VS Code extension)

> _What has actually been **executed**, step by step. The guide describes intent, [`status.md`](status.md)
> states the guide's state — this file states **where you are in it**._
>
> Tick a step the moment you finish it, not at the end of a sitting: every maintenance skill that must avoid
> rewriting work you have already done reads this file to find the boundary. An unticked step is treated as
> **not done**, and an unticked guide is a guide those skills cannot safely amend.

## Legend
| Mark | Meaning |
|------|---------|
| `[ ]` | not executed yet |
| `[x]` | executed, and the step's **Done when** was observed |
| `[~]` | executed, but the **Done when** did not pass (or was skipped) — the row says what is outstanding |
| `[!]` | executed, then **invalidated** by a later change to the guide — the row names the retrofit that repairs it |

## Current position
- **Last executed:** M6 / `03_generate-overrides.md`.
- **Next up:** M6 / `04_provider-overrides.md` — **start with its *Before you continue — corrections* section**,
  which carries the whole readability repair (2026-08-17). Nothing behind this line was rewritten.

## MILESTONE_1 — Scaffold + sidebar panel
- [x] `01_prerequisites.md` — Check your prerequisites · 2026-08-16
- [x] `02_scaffold.md` — Scaffold the extension with `yo code` · 2026-08-16
- [x] `03_first-run.md` — First F5 run: the generated Hello World · 2026-08-16
- [x] `04_icon-asset.md` — Add the Activity-Bar icon asset · 2026-08-16
- [x] `05_contribute-view.md` — Declare the View Container + Webview View · 2026-08-16
- [x] `06_provider.md` — Create the WebviewViewProvider · 2026-08-16
- [x] `07_register-provider.md` — Register the provider (the panel renders) · 2026-08-16
- [x] `08_webview-button.md` — Add a button + script to the webview · 2026-08-16
- [x] `09_message-roundtrip.md` — Receive the message in the extension · 2026-08-16
- [x] `10_verify.md` — milestone gate · 2026-08-16

## MILESTONE_2 — Non-destructive backbone
- [x] `01_settings.md` — Create the settings descriptors · 2026-08-16
- [x] `02_apply.md` — Write the one apply function (`applyChrome`) · 2026-08-16
- [x] `03_history.md` — Build the snapshot history (Revert / Reset) · 2026-08-16
- [x] `04_wire-extension.md` — Instantiate the history and inject it into the provider · 2026-08-16
- [x] `05_panel-buttons.md` — Panel buttons: Apply demo / Revert / Reset · 2026-08-16
- [x] `06_verify.md` — milestone gate · 2026-08-16

## MILESTONE_3 — Color-formula engine (chrome)
- [x] `01_color-utils.md` — Color utilities: hex, HSL, and WCAG contrast · 2026-08-16
- [x] `02_types.md` — The engine's types (`StyleProfile`, `Palette`, …) · 2026-08-16
- [x] `03_combos.md` — The five starter combos · 2026-08-16
- [x] `04_profiles-generative-1.md` — Generative profiles I: `base()` + Neon, Pastel, Midnight · 2026-08-16
- [x] `05_profiles-generative-2.md` — Generative profiles II: the remaining six · 2026-08-16
- [x] `06_generate.md` — Generate: palette → workbench chrome · 2026-08-16
- [x] `07_panel-selects.md` — Panel: two dropdowns → live chrome · 2026-08-16
- [x] `08_verify.md` — milestone gate · 2026-08-16

## MILESTONE_4 — Preset gallery + panel UX ⭐ reality-check gate
- [x] `01_signature-profiles.md` — Add the 4 signature presets to the engine · 2026-08-16
- [x] `02_styles.md` — Create `media/webview/styles.css` · 2026-08-16
- [x] `03_main-js.md` — Create `media/webview/main.js` — the gallery + preview + contrast · 2026-08-16
- [x] `04_provider-externalize.md` — Rewrite the provider to serve external files, and wire `extensionUri` in · 2026-08-16
- [x] `05_verify.md` — milestone gate (+ the ⭐ reality check) · 2026-08-16

## MILESTONE_5 — Tokens and persistence
- [x] `01_types-extend.md` — Extend the engine types (tokens + semantic) · 2026-08-16
- [x] `02_generate-extend.md` — Widen `ThemeResult` and generate token + semantic colors · 2026-08-16
- [x] `03_apply-extend.md` — Apply tokens + semantic, and scope tokens per language · 2026-08-16, retrofit applied 2026-08-17 — the M6/01 corrections were applied to `src/theme/apply.ts` (in-value scoping); the gate that proves it is M6/10 check 10, still unrun
- [x] `04_history-extend.md` — History captures all three settings · 2026-08-16
- [x] `05_storage.md` — Save named sets with `globalState` · 2026-08-16
- [x] `06_provider-final.md` — The final provider (save / applySet / delete / import / export) · 2026-08-16
- [x] `07_main-js-final.md` — The final webview (language box, Save/Export/Import, My sets) · 2026-08-16
- [x] `08_export-import.md` — Export / import round-trip · 2026-08-16
- [!] `09_verify.md` — milestone gate · 2026-08-16 — **invalidated by the 2026-08-16 amendment.** Checks 1–4 passed; check 5 asserted a `"[typescript]"` block the Configuration API will not write. **Retrofit:** *Before you continue — corrections* in `M6/01_types-overrides.md`, then gate check 10 in `M6/10_verify.md`

## MILESTONE_6 — Per-role color editing
- [x] `01_types-overrides.md` — Add the `ThemeOverrides` type · 2026-08-17 (including its *Before you continue — corrections* section)
- [x] `02_overrides-module.md` — `src/engine/overrides.ts` — validate a hex, merge a sparse patch · 2026-08-17
- [x] `03_generate-overrides.md` — Thread overrides through `generate()` · 2026-08-17
- [ ] `04_provider-overrides.md` — The provider passes overrides through and echoes the effective colors back — **carries the readability corrections (2026-08-17); apply them first**
- [ ] `05_styles-editor.md` — Style the role rows
- [ ] `06_webview-chrome-editor.md` — The webview holds overrides + effective colors, and edits the 8 chrome roles
- [ ] `07_webview-token-editor.md` — Extend the editor to the 7 token roles + 13 semantic types
- [ ] `08_clear-and-revert.md` — Un-pin one role, clear them all, and how this meets Revert / Reset
- [ ] `09_persist-overrides.md` — Saved sets remember their overrides
- [ ] `10_verify.md` — milestone gate

## MILESTONE_7 — Packaging
- [ ] `01_package.md` — Add `publisher` and package the `.vsix`
- [ ] `02_verify.md` — milestone gate (install it, close the status-bar exception)
