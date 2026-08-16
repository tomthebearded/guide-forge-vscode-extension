# Feedback log — Van Code (VS Code extension)

> Append-only field log of friction readers hit while following this guide. Its purpose is to improve the
> guide **and** the GuideForge method over time — so entries are captured even when the guide is not (yet)
> changed. This is a **record, not a to-do**: logging an entry here does not by itself change the guide. To
> actually fix the guide from a report, run `/report-issue` (it fixes the root cause and sweeps for siblings).
>
> Written by `/log-feedback` (capture) and, when a fix ships, by `/report-issue`. Newest entries on top; one
> entry per distinct piece of friction. Use absolute dates (`2026-07-09`), never "today".

### 2026-08-10 · M5/03 (+ D2, M5/00, M5/09 check 5) · `overrideInLanguage` throws — the two token settings are NOT language-overridable
- **Where:** M5 step 03 (`applyTokens` / `applySemantic` → `cfg.update(KEY, value, TARGET, languageId ? true : undefined)`,
  and the 🧠 concept note "the language-override 4th argument to `config.update`"). Same premise in M5/00's
  troubleshooting row (`editor.*` accepts a `"[languageId]"` override; `workbench.*` does not),
  [decision-log D2](foundation/decision-log.md#d2--per-language-scoping-is-tokens-only), and M5/09 gate check 5.
- **Reader:** the guide's target reader — Intermediate TS, New to the VS Code Configuration API; following M5
  end-to-end via <kbd>F5</kbd> with the step's code typed verbatim.
- **What happened:** Applied a theme with a languageId set. Nothing was written and the extension host logged:
  ```
  rejected promise not handled within 1 second: CodeExpectedError: Unable to write to Language Settings
  because editor.tokenColorCustomizations is not a resource language setting.
      at x6e.toConfigurationEditingError … at x6e.validate … at x6e.doWriteConfiguration
  ```
  Expected: a `"[typescript]"` block in `settings.json` scoping the token colors to TypeScript, per the step.
- **Suspected class:** `stale value/command/API` — more precisely a **wrong API premise**, not staleness: the step
  asserts "Only `editor.*` settings (our two token settings) accept the override". VS Code gates
  `overrideInLanguage` on a setting's declared **scope** (`resourceLanguage` / language-overridable), not on its
  `editor.` namespace. Both `editor.tokenColorCustomizations` and `editor.semanticTokenColorCustomizations` are
  application-scoped theme-customization settings, so `validate()` rejects the write for **both** — the failure is
  not TypeScript-specific and not chrome-specific. The real mechanisms (verified against the official docs on
  2026-08-10, to be confirmed by whoever fixes this):
  - **Semantic** scopes per language *inside the value*, via the rule-key selector grammar
    `(*|tokenType)(.tokenModifier)*(:tokenLanguage)?` — e.g. `"variable.readonly:java"`, `"class:java"`
    ([Semantic Highlight guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)).
  - **TextMate** named keys (`comments`, `keywords`, …) cannot scope per language **at all**; it needs
    `textMateRules` with language-qualified scopes (e.g. `source.ts comment`). The
    [Themes docs](https://code.visualstudio.com/docs/configure/themes) document per-**theme** `"[Monokai]"`
    scoping for this setting and no per-language form.
  - Knock-on the fix must handle: with both paths living in one global value instead of separate `[lang]` blocks,
    `applyTokens`/`applySemantic` can no longer *replace* the setting — a scoped apply would wipe the global one —
    so they need read-merge-write, which also touches M2's snapshot/Revert backbone.
- **Severity:** blocker (the step's code cannot work as written; the milestone's per-language feature is unbuildable
  by this route, and M5/09 check 5 asserts a behaviour the API does not offer).
- **Tags:** `M5` `M5/03` `D2` `configuration-api` `overrideInLanguage` `resourceLanguage-scope` `tokenColorCustomizations`
  `semanticTokenColorCustomizations` `textMateRules` `wrong-api-premise` `verify-gate` `known-suspect`
- **Note:** the guide's own README Updates entry of 2026-08-09 already listed this as an **open suspect** — "whether
  `editor.semanticTokenColorCustomizations` is truly language-overridable (M5/09 check 5 depends on it)". This report
  closes that suspect: it is not, and neither is the TextMate one.
- **Status:** fixed via /amend-guide (2026-08-16) — treated as a change of intent rather than a defect, because M1–M5
  were already executed and M5 could not be rewritten under the reader. The mechanism moves inside the setting value
  (`:languageId` semantic rule keys; `textMateRules` with `source.ts …` scopes); M5/00, M5/03 and M5/09 carry a
  superseded banner only, and the repair is the *Before you continue — corrections* section at the top of
  [M6/01](MILESTONE_6_per-role-color-editing/01_types-overrides.md), proved by new gate check 10 in M6/10.
  [D2](foundation/decision-log.md#d2--per-language-scoping-is-tokens-only) amended, [D11](foundation/decision-log.md#d11--language-scoping-lives-inside-the-setting-value-and-a-scoped-apply-replaces-the-global-one) added.

### 2026-08-10 · M5/06 · a failed apply surfaces as an unhandled-rejection stack, not a message
- **Where:** M5 step 06 (`themePanelProvider.ts`, the `apply` message handler → `await this.history.apply(() => applyTheme(theme, m.languageId || undefined))`).
- **Reader:** same reader/session as the entry above.
- **What happened:** When the apply threw (see above), the reader got a raw
  `rejected promise not handled within 1 second: CodeExpectedError …` with a minified `workbench.desktop.main.js`
  stack trace in the extension-host console — no panel state change, no notification, no hint about which action
  failed. Diagnosing required reading the VS Code internals frame names.
- **Suspected class:** `pedagogy-gap` (guess) — the provider's message handlers are taught without any error
  handling, so every write failure in M2→M6 degrades to console noise. A `try/catch` + `showErrorMessage` around the
  `history.apply(...)` call would name the failing action and keep the history consistent. Worth checking whether
  the same shape recurs in M2/05, M3/07, M4/04 and M6/04, which teach the same handler pattern.
- **Severity:** slowed-down (does not block a correct build, but makes any real failure much harder to place).
- **Tags:** `M5` `M5/06` `provider` `error-handling` `unhandled-rejection` `diagnosability` `sweep-candidate`
- **Quote:** "rejected promise not handled within 1 second"
- **Status:** logged

### 2026-08-10 · M5/07 · the per-language control is a free-text box, so a typo silently does nothing
- **Where:** M5 step 07 (`media/webview/main.js` — the per-language input, `placeholder: 'languageId e.g. typescript (blank = all)'`,
  committed on `change` into `state.languageId`).
- **Reader:** same reader/session as the entries above.
- **What happened:** The reader has to **know and type** a VS Code language identifier by hand. Nothing lists the
  available ids, nothing validates the input, and an unknown or misspelled id (`ts`, `Typescript`, `node`) is
  accepted and sent to the provider, where it produces a scope that matches no file — indistinguishable from a
  broken apply. The reader asked for the control to offer the languages VS Code actually knows about instead.
- **Suspected class:** `pedagogy-gap` (guess) — the step teaches the message plumbing but not the discovery API.
  `vscode.languages.getLanguages()` returns the ids registered in the running instance and would let the panel
  render a populated `<select>` (or a `QuickPick`), turning an unverifiable free-text field into a closed choice.
- **Severity:** confusing (silent no-op on wrong input; the reader cannot tell a typo from a failed feature).
- **Tags:** `M5` `M5/07` `webview` `languageId` `input-validation` `getLanguages` `discoverability` `ux`
- **Status:** logged

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
- **Status:** fixed via /report-issue (2026-08-07) — M2's demo now applies both status-bar pairs (4 keys) with a
  precedence concept note + glossary entry + failure note; the same class swept out of M3/06–08, M3/00 and M4/06
  (where the generated palette re-masks the bar), with M5/10 closing the loop after `.vsix` install. Engine left at
  20 keys by [D7](foundation/decision-log.md#d7--m2s-demo-sets-the-status-bar-debugging-colors-the-m3-engine-map-does-not).

### 2026-07-13 · M4/03 (+ M5/07) `media/webview/main.js` · double-apply on every pick
- **Where:** M4 step 03 (and its M5 final rewrite, step 07) — the webview's `render()` / chip click handlers.
- **Reader:** guide audit.
- **What happened:** Selecting any chip stepped the history **twice** — `render()` ended with `apply()` and each click handler also called `apply()`, so two identical `apply` messages went to the provider per pick. The first **Revert** looked inert (it popped the duplicate snapshot), contradicting the M4/06 gate "one snapshot per apply".
- **Suspected class:** duplicated side-effect / apply called from two layers.
- **Severity:** medium (functional bug; Revert visibly wrong on the first click).
- **Tags:** `double-apply` `history` `webview`
- **Quote:** "each chip click handler does `render(); apply();` but render() already ends with apply()."
- **Status:** fixed via /report-issue (2026-07-13) — `render()` made pure; apply once per click + once from `init`; verify copies + gate/Revert wording reconciled; rule 5.1 guard added.

