# M7 · Step 02 of 2 — Install it, close the status-bar exception, and you're done
> Nav: [← Package the .vsix](01_package.md) · [Overview](00_overview.md) · [Guide front door →](../README.md)

## Done-when gate (run every check)
Check 1 runs in a terminal. Checks 2–4 run in an **ordinary VS Code window** — *not* the Extension Development
Host. That distinction is the point of check 3, so don't press <kbd>F5</kbd> for this gate.

### 1. The package builds
- In the project-root terminal: `vsce package` (or `npx @vscode/vsce package`).
- **Expected:** the final line ends with **`van-code-0.0.1.vsix`** and the file is in the project root
  (`Get-ChildItem *.vsix` on Windows, `ls *.vsix` elsewhere). Warnings about a missing `LICENSE` are fine; errors
  are not.

### 2. It installs and actually works
- In an ordinary window: Command Palette → **Extensions: Install from VSIX…** → pick `van-code-0.0.1.vsix`.
- **Expected:** it installs with no error and the **Van Code** icon appears in the Activity Bar. (If a *Reload* is
  offered, take it.)
- Open the panel and run the whole tool once, in this real window:
  - pick a **Starter combination** and a **Style** → chrome and code recolor live;
  - open **Fine-tune** → all **28** role rows are there; pin `bg` → the background and every surface derived from
    it follow on release;
  - **Save set…**, then click the saved name under **My sets** → it re-applies **and** the pickers come back
    pinned;
  - **Revert** steps back one pick at a time; **Reset** removes every customization.
- **Expected:** identical behaviour to <kbd>F5</kbd>. If the panel is **blank**, the webview assets didn't make it
  into the package — see the troubleshooting row about `media/` vs `src/`.

### 3. The status bar recolors — the M3 exception closes
- Still in the ordinary window, apply any preset.
- **Expected:** the **status bar recolors with everything else.**

> 💡 **Why it never did under <kbd>F5</kbd>.** The Extension Development Host is a window with an active debug
> session, so VS Code paints its status bar from `statusBar.debuggingBackground` / `statusBar.debuggingForeground`,
> which **override** the `statusBar.background` the engine writes. Every gate from M3 onward said so and told you to
> confirm the write in `settings.json` instead. This window has no debug session, so nothing overrides it. It was a
> dev-loop artifact, never a defect — the engine has written that key correctly since M3.
> → [D7](../foundation/decision-log.md#d7--m2s-demo-sets-the-status-bar-debugging-colors-the-m3-engine-map-does-not),
> [Theme Color reference — status bar](https://code.visualstudio.com/api/references/theme-color#status-bar-colors).

### 4. Clean exit
- Click **Reset** in the panel, then check `settings.json` (Command Palette → **Preferences: Open User Settings
  (JSON)**).
- **Expected:** `workbench.colorCustomizations`, `editor.tokenColorCustomizations` and
  `editor.semanticTokenColorCustomizations` are **gone** — keys deleted, not blanked. The extension leaves no
  residue in a real editor, which is the promise M2 made on its very first write.
- If you don't want two copies of the extension around while you keep developing, uninstall the VSIX one
  (**Extensions** view → Van Code → **Uninstall**); <kbd>F5</kbd> keeps working regardless.

If all four pass, **M7 is done — and so is the build.**

## What's automatable vs. checked by hand
- **The package step is a CLI command** with a deterministic output line, so check 1 is as close to automatable as
  this guide gets — but it still needs a real `npm`/`vsce` on your machine and can't be simulated from here.
- **Checks 2–4 are by hand, in a running editor**, and deliberately so: they exist to catch the failures a build
  script can't see — a package that emits a file but ships a blank panel, or an extension that leaves settings
  behind when you uninstall it.

## Files after this milestone (complete contents)
M7 modifies **one file**. Everything else is exactly as [M6's checkpoint](../MILESTONE_6_per-role-color-editing/10_verify.md)
left it.

### `package.json`
```jsonc
{
  "name": "van-code",
  "displayName": "Van Code",
  "description": "Recolor the whole editor from a sidebar panel",
  "version": "0.0.1",
  "publisher": "example",
  "repository": {
    "type": "git",
    "url": "https://github.com/example/van-code"
  },
  "engines": {
    "vscode": "^1.128.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "vanCode",
          "title": "Van Code",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "vanCode": [
        {
          "id": "vanCode.panel",
          "name": "Van Code",
          "icon": "media/icon.svg",
          "type": "webview"
        }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src",
    "test": "vscode-test"
  },
  "devDependencies": {
    "@types/vscode": "^1.128.0",
    "@types/node": "24.x",
    "@types/mocha": "^10.0.10",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.9.0",
    "@vscode/test-cli": "^0.0.11",
    "@vscode/test-electron": "^2.4.0"
  }
}
```

## Troubleshooting sheet (M7 traps)
| Symptom | Usual cause | Fix |
|---------|-------------|-----|
| `ERROR Missing publisher name` | no `publisher` in `package.json` | add `"publisher": "example"` — its presence, not its value (step 01) |
| `vsce: command not found` | CLI not installed | `npm install -g @vscode/vsce`, or `npx @vscode/vsce package` |
| compile error during packaging | `vscode:prepublish` runs `tsc` and it failed | fix the TypeScript error `vsce` prints, then re-run — a red compile is a failed package |
| `ERROR @types/vscode ^x < engines.vscode ^y` | `@types/vscode` below `engines.vscode` | keep both at `^1.128.0` (they match by design) |
| Installed extension shows a **blank panel** | webview assets were stripped from the `.vsix` | they must live under `media/webview/`, never `src/` — `.vscodeignore` excludes `src/**` (M4 step 02) |
| Panel works but nothing applies | you're testing in a window where the M6 build never compiled | re-run `vsce package` after a clean `npm run compile`; the `.vsix` ships `out/`, not `src/` |
| Status bar still not recoloring | you're in the Extension Development Host | that's check 3's whole point — test in an ordinary window |
| Two Van Code panels / duplicate icons | the VSIX copy and the F5 copy are both active | uninstall the VSIX one while developing |

## You're done — what you built
Over seven milestones you built a complete, installable VS Code extension from an empty scaffold:

- **M1** — a real extension with an Activity-Bar icon, a Webview sidebar panel, and two-way messaging.
- **M2** — a non-destructive backbone: snapshot-before-write, Revert, Reset — one write path, always reversible.
- **M3** — a pure, `vscode`-free color engine: hex↔HSL math, WCAG contrast, 5 starter combos, 9 generative
  profiles that derive a full chrome palette from a seed.
- **M4** — an externalized gallery UI (13 profiles incl. 4 signature presets) with live swatch preview and a WCAG
  contrast readout — the reality-check gate where the tool became genuinely usable.
- **M5** — syntax + semantic **token** recoloring, **saved sets** persisted in `globalState`, **JSON
  import/export**, and **per-language token scoping** — the language carried **inside the setting value**
  (`source.ts comment` scopes, `:typescript` rule keys), with the taught reason chrome can't be scoped at all.
- **M6** — **per-role overrides**: a picker for each of the 28 roles the engine emits, validated and merged inside
  the pure engine, layered over the formula rather than replacing it, and saved with the set.
- **M7** — a packaged, installable **`van-code-0.0.1.vsix`**.

The architecture held the whole way. A pure engine you can unit-test in plain Node — which is why M6's riskiest
logic (a merge that must never blank a color) was provable with a one-line `node -e` before any UI existed. A thin
adapter that owns every side effect. And a single choke point for settings writes that kept "non-destructive"
honest even as the surface grew from one workbench color to three full customization settings *and* a hand-editable
28-role palette. `src/theme/` earned exactly one change after M5 — the two token-apply functions, rewritten in M6's
corrections when the per-language mechanism turned out to be the wrong one — and even that landed **behind the same
choke point**, which is why Revert kept working through it without a line of history code moving.

**Where to go next (all deliberately out of scope here):** publish to the Marketplace with `vsce publish` (needs a
registered publisher + token); add file-icon/product-icon theming; reframe per-language scoping as per-*workspace*
theming (chrome *can* vary per workspace — noted in [D2](../foundation/decision-log.md#d2--per-language-scoping-is-tokens-only));
or extend the override layer past the palette to individual workbench keys, which is where you'd finally need the
searchable key list the plan ruled out ([D9](../foundation/decision-log.md#d9--overrides-are-role-level-not-vs-code-key-level)).

## Next
There is no M8 — this was the final milestone. Head back to the **[guide front door](../README.md)** for the
one-page recap and the Updates log.

---
> Nav: [← Package the .vsix](01_package.md) · [Overview](00_overview.md) · [Guide front door →](../README.md)
