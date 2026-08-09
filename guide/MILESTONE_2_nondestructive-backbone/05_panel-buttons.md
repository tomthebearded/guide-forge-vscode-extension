# M2 · Step 05 of 6 — Panel buttons: Apply demo / Revert / Reset
> Nav: [← Wire extension](04_wire-extension.md) · [Overview](00_overview.md) · [Verify →](06_verify.md)

## Glossary for this step
- **[Debugging colors (status bar)](../foundation/glossary.md#debugging-colors-status-bar)** — the alternate status-bar color keys (`statusBar.debuggingBackground` / `debuggingForeground` / `debuggingBorder`) VS Code paints with while a program is being debugged; they override the ordinary `statusBar.background` / `statusBar.foreground`.

## Why / design
Now the panel drives the backbone. We rewrite the provider so it (1) receives the shared `ThemeHistory` in its
constructor, (2) renders three buttons, and (3) routes each button's message to the matching history call. This
closes the loop M1 opened: the webview posts a message, `onDidReceiveMessage` receives it, and — new in M2 — the
extension *acts* on it by writing a setting through the safe path.

The message protocol is three flat message types, mirroring the three buttons:
- **`applyDemo`** → `history.apply(() => applyChrome({ …four status-bar keys… }))` (the exact object is in the code
  below). The `history.apply` wrapper snapshots first, so this is reversible.
- **`revert`** → `history.revert()`.
- **`reset`** → `history.reset()`.

Notice the provider never calls `getConfiguration().update(...)` itself — it goes through `applyChrome` and
`ThemeHistory`. That's the single-write-path convention holding: the panel decides *what* to apply; `theme/` decides
*how* to write it safely.

The demo apply uses the exact hexes `#e11d48` (a crimson red) on the status bar's **background** keys and `#ffffff` on
its **foreground** keys — all four **load-bearing** (the verify gate checks these values in `settings.json`). The message
type strings `applyDemo` / `revert` / `reset` are **load-bearing** too: the webview posts them and `onMessage`'s
`switch` reads them — a mismatch is a dead button with no error. The button **labels** are cosmetic.

> 🧠 **New concept — the status bar has a *second* set of colors while you're debugging.** VS Code paints the status
> bar from `statusBar.background` / `statusBar.foreground` normally, but from
> **`statusBar.debuggingBackground` / `statusBar.debuggingForeground`** *"when a program is being debugged"* — the
> orange bar you've seen since M1. Those debugging keys **win** while a debug session is active; the ordinary pair is
> simply not used. Docs: [Status Bar colors](https://code.visualstudio.com/api/references/theme-color#status-bar-colors).
>
> This matters here more than it looks: the Extension Development Host **is** a window with an active debug session
> (that's what <kbd>F5</kbd> starts), so the very window you're told to watch is the one where the ordinary
> `statusBar.background` is overridden. That's why the demo payload sets **both pairs** — four keys, same two hexes.
> It's not decoration: without the debugging pair, Apply writes correctly to `settings.json` and you see *nothing*.
> *(There is a third key, `statusBar.debuggingBorder`; we skip it — it only draws the 1px separator line.)*
>
> ⚠️ **Failure note.** If the demo ever seems to do nothing — `settings.json` gains the block, but the EDH's status bar
> stays orange until you stop the session with <kbd>Shift</kbd>+<kbd>F5</kbd> — you've written the ordinary pair only.
> Add the two `debugging*` keys. This is a **precedence** problem, not a write problem: the setting landed fine.

## Do this
This step **replaces** the whole contents of `src/panel/ThemePanelProvider.ts` (the M1 version rendered the ping
demo; we swap in the M2 version).

1. Open `src/panel/ThemePanelProvider.ts`.
2. Select all and replace it with the code below. What changed from M1:
   - **Imports** `applyChrome` (from `../theme/apply`). The `ThemeHistory` import and the
     `constructor(private readonly history: ThemeHistory) {}` line are already there from
     [step 04](04_wire-extension.md) — keep them exactly as they are; this is the step that finally *uses*
     `this.history`.
   - **Adds** `onMessage`, a `switch` over `m.type` doing the three history calls above, and wires it with
     `onDidReceiveMessage((m) => this.onMessage(m))`.
   - **Rewrites** the HTML body: three `<button>`s and an inline nonce'd script that posts one message type per
     button. The CSP + `getNonce()` pattern is unchanged from M1 (script allowed only via the matching nonce).
3. Save. If the `watch` task is running it recompiles; otherwise run `npm run compile` — it should still report 0
   errors, as it did at the end of step 04.
4. Press <kbd>F5</kbd> (or stop the EDH with <kbd>Shift</kbd>+<kbd>F5</kbd> and F5 again) and open the Van Code panel.

## Code
`src/panel/ThemePanelProvider.ts` *(the M2 version — a near-total rewrite of the M1 provider; the complete file is also in [06_verify.md](06_verify.md))*
```ts
import * as vscode from 'vscode';
import { ThemeHistory } from '../theme/history';
import { applyChrome } from '../theme/apply';

export class ThemePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vanCode.panel';

  constructor(private readonly history: ThemeHistory) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((m) => this.onMessage(m));
  }

  private async onMessage(m: { type: string }): Promise<void> {
    switch (m.type) {
      case 'applyDemo':
        await this.history.apply(() =>
          applyChrome({
            'statusBar.background': '#e11d48',
            'statusBar.foreground': '#ffffff',
            // The debugging pair overrides the pair above while a debug session is active —
            // and the Extension Development Host always has one. Both, or you see nothing.
            'statusBar.debuggingBackground': '#e11d48',
            'statusBar.debuggingForeground': '#ffffff',
          }),
        );
        break;
      case 'revert':
        await this.history.revert();
        break;
      case 'reset':
        await this.history.reset();
        break;
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <title>Van Code</title>
</head>
<body>
  <h3>Van Code</h3>
  <button id="apply">Apply demo (red status bar)</button>
  <button id="revert">Revert</button>
  <button id="reset">Reset</button>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('apply').addEventListener('click', () => vscode.postMessage({ type: 'applyDemo' }));
    document.getElementById('revert').addEventListener('click', () => vscode.postMessage({ type: 'revert' }));
    document.getElementById('reset').addEventListener('click', () => vscode.postMessage({ type: 'reset' }));
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
  return text;
}
```

## Done when (this step)
- The project compiles with **no** errors (as it already did after step 04 — this step adds behaviour, not a fix).
- In the EDH, opening the Van Code panel shows a heading **"Van Code"** and three buttons:
  **Apply demo (red status bar)**, **Revert**, **Reset**.
- Clicking **Apply demo** turns the EDH's status bar crimson (`#e11d48`) with white text, **live** — *while the debug
  session is still running*, with the orange debug color replaced. (The full apply → revert → reset walkthrough, with
  the `settings.json` diffs, is the milestone gate in [step 06](06_verify.md).)

## If it breaks
- **"Expected 0 arguments, but got 1"** → the rewrite dropped step 04's constructor. It must still read
  `constructor(private readonly history: ThemeHistory) {}` inside the class — the code block below includes it.
- **Buttons render but nothing happens on click** → most likely a message-type mismatch (the posted `type` string
  must equal a `case` in `onMessage`), or a CSP/nonce problem (open **Developer: Open Webview Developer Tools** and
  look for a CSP violation — the `script-src 'nonce-…'` and the `<script nonce="…">` must share the same `${nonce}`).
- **`settings.json` gets the block but the status bar stays orange — and only turns crimson once you stop the debug
  session** → the demo object is missing `statusBar.debuggingBackground` / `statusBar.debuggingForeground`. The EDH is
  being debugged, so those two override the ordinary pair (see the concept note above). All **four** keys are required.
- **Status bar doesn't change and `settings.json` doesn't change either** → confirm `applyChrome` is imported from
  `../theme/apply` and the demo object uses the exact keys above. Also make sure you relaunched the EDH after
  compiling (<kbd>Shift</kbd>+<kbd>F5</kbd> then <kbd>F5</kbd>).
- **`acquireVsCodeApi is not defined`** → `enableScripts: true` isn't set in `resolveWebviewView`; confirm it's there.

---
> Nav: [← Wire extension](04_wire-extension.md) · [Overview](00_overview.md) · [Verify →](06_verify.md)
