# Feedback log — Van Code (VS Code extension)

> Append-only field log of friction readers hit while following this guide. Its purpose is to improve the
> guide **and** the GuideForge method over time — so entries are captured even when the guide is not (yet)
> changed. This is a **record, not a to-do**: logging an entry here does not by itself change the guide. To
> actually fix the guide from a report, run `/report-issue` (it fixes the root cause and sweeps for siblings).
>
> Written by `/log-feedback` (capture) and, when a fix ships, by `/report-issue`. Newest entries on top; one
> entry per distinct piece of friction. Use absolute dates (`2026-07-09`), never "today".

### 2026-08-07 · M2/05 (+ M2/06 gate) · demo red status bar invisible while the debug session runs
- **Where:** M2 step 05 (`applyDemo` → `applyChrome({ 'statusBar.background': '#e11d48', … })`, and its "Done when"
  bullet "turns the EDH's status bar crimson … **live**"), and M2 step 06 gate check 3 ("immediately, with no reload").
- **Reader:** the guide's target reader — Intermediate TS, **New** to the VS Code Extension API and to the
  Configuration API; following M2 end-to-end via <kbd>F5</kbd>.
- **What happened:** Clicked **Apply demo** in the EDH. `settings.json` gained the expected
  `workbench.colorCustomizations` block, but the EDH's status bar did **not** turn crimson — it stayed the
  debug-session orange. The red only appeared after stopping the debug session (<kbd>Shift</kbd>+<kbd>F5</kbd>).
  The reader read this as the apply being broken: *"it works but it applies the color only when i close the debug
  session."*
- **Suspected class:** `pedagogy-gap` (guess) — the code is correct; the guide never tells the reader that while a
  debug session is active VS Code paints the status bar from `statusBar.debuggingBackground` /
  `statusBar.debuggingForeground`, which override `statusBar.background` / `statusBar.foreground`. So the one color
  key the demo picks is the one key that is masked in the exact environment the guide tells the reader to observe it
  in. Neither step 05's "If it breaks" list nor step 06's troubleshooting table mentions it; step 05's row for
  "Status bar doesn't change but no error" instead sends the reader to re-check keys and relaunch the EDH — a dead end
  here.
- **Severity:** blocker (the milestone gate's headline check appears to fail on a correct implementation; the reader
  cannot tell success from failure).
- **Tags:** `M2` `statusBar` `debugging-colors` `EDH` `verify-gate` `false-negative` `colorCustomizations`
- **Quote:** "it works but it applies the color only when i close the debug session"
- **Status:** logged.

### 2026-07-13 · M4/03 (+ M5/07) `media/webview/main.js` · double-apply on every pick
- **Where:** M4 step 03 (and its M5 final rewrite, step 07) — the webview's `render()` / chip click handlers.
- **Reader:** guide audit.
- **What happened:** Selecting any chip stepped the history **twice** — `render()` ended with `apply()` and each click handler also called `apply()`, so two identical `apply` messages went to the provider per pick. The first **Revert** looked inert (it popped the duplicate snapshot), contradicting the M4/06 gate "one snapshot per apply".
- **Suspected class:** duplicated side-effect / apply called from two layers.
- **Severity:** medium (functional bug; Revert visibly wrong on the first click).
- **Tags:** `double-apply` `history` `webview`
- **Quote:** "each chip click handler does `render(); apply();` but render() already ends with apply()."
- **Status:** fixed via /report-issue (2026-07-13) — `render()` made pure; apply once per click + once from `init`; verify copies + gate/Revert wording reconciled; rule 5.1 guard added.

