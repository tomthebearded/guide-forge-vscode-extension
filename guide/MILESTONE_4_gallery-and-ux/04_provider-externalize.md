# M4 · Step 04 of 5 — Rewrite the provider to serve external files, and wire `extensionUri` in
> Nav: [← The gallery script](03_main-js.md) · [Overview](00_overview.md) · [Verify + reality check →](05_verify.md)

## Glossary for this step
- **`asWebviewUri`** — converts a file-on-disk `Uri` into a special URI the webview is actually allowed to load.
- **`localResourceRoots`** — the whitelist of folders a webview may load local files from.

## Why / design
The provider stops embedding HTML+JS+CSS as a string and instead serves the two files you just wrote, then speaks
the message protocol from step 03: reply to `ready` with `init`, and after each `apply` send back `applied` with
the palette and contrast ratio. The engine already exists — this step is pure adapter wiring.

> 🧠 **New concept — `asWebviewUri` & why a plain file path fails.** A webview runs on an opaque internal origin
> (something like `vscode-webview://…`), **not** on your filesystem. So a normal path or `file://` URL in
> `<script src>` / `<link href>` **will not load** — the webview can't reach the disk directly, and the CSP blocks
> it. You must convert each on-disk `Uri` with **`webview.asWebviewUri(uri)`**, which returns a rewritten URL the
> webview *is* permitted to fetch. You build the on-disk `Uri` with `vscode.Uri.joinPath(this.extensionUri, 'media',
> 'webview', 'main.js')`. Docs:
> [Webview → loading local content](https://code.visualstudio.com/api/extension-guides/webview#loading-local-content).

> 🧠 **New concept — `localResourceRoots`.** Even with a correct `asWebviewUri`, a webview may only load local files
> from folders you explicitly whitelist in `webview.options.localResourceRoots`. We set it to
> `[Uri.joinPath(this.extensionUri, 'media')]` — the whole `media/` tree — so `media/webview/main.js` and
> `styles.css` are allowed and nothing else on disk is. Omit this (it defaults to the extension root or the view's
> folder) and you can get a blank panel with a console error about a resource being blocked. Docs:
> [Webview → `WebviewOptions.localResourceRoots`](https://code.visualstudio.com/api/references/vscode-api#WebviewOptions).

> ⚠️ **Two things must agree for a file to load:** (1) `localResourceRoots` covers its folder (`media`), **and**
> (2) the CSP allows its type — our CSP has `style-src ${webview.cspSource}` and `script-src 'nonce-…'`. The
> external `<script>` carries the nonce; the external `<link>` is covered by `cspSource`. If either is wrong the
> file silently fails to load.

To reach `media/`, the provider needs the extension's install folder as a `Uri`. That's **`extensionUri`** — a new
first constructor parameter, which means `extension.ts` (its only call site) changes in the same step.

> 🧠 **New concept — `context.extensionUri`.** When VS Code activates your extension it hands `activate` an
> **`ExtensionContext`**. Its **`extensionUri`** is a `Uri` pointing at your extension's **install directory on
> disk** — the folder that contains `package.json`, `out/`, and `media/`. That's exactly the anchor the provider
> needs to build paths to `media/webview/main.js` and `styles.css` (via `Uri.joinPath`) and to whitelist `media/`
> in `localResourceRoots`. Prefer `extensionUri` over the older string `extensionPath`: it's a proper `Uri`, so it
> composes with `Uri.joinPath` and works across remote/virtual filesystems. Docs:
> [ExtensionContext.extensionUri](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext).

> 📌 **Why this step touches two files.** A constructor signature and its call site are one change, not two. Split
> across two steps the project would sit broken in between ("Expected 2 arguments, but got 1") and a real mistake of
> yours would hide inside an error the guide told you to expect. Part B below is a single line, and **this step ends
> with the project compiling clean.**

## Do this
This step **edits two files**: `src/panel/ThemePanelProvider.ts` (a whole-file replacement) and `src/extension.ts`
(one line).

### A. `src/panel/ThemePanelProvider.ts`
It **replaces the whole contents** of the file: the M3 provider (inline HTML +
`<select>` dropdowns) becomes an adapter that serves the two external files and speaks the M4 message protocol.
Because nearly every line changes, the **complete paste-able file lives in [the M4 checkpoint](05_verify.md)** under
`### src/panel/ThemePanelProvider.ts (END OF M4)` — open it, select-all in your file, and paste that. The fragments
below walk only the regions that changed from M3 and why; `getNonce()` is **unchanged from M3** (it's in the
checkpoint too — don't re-type it).

> **Before you start:** steps [02](02_styles.md) and [03](03_main-js.md) must have created
> `media/webview/styles.css` and `media/webview/main.js` (the provider serves them), and M3's
> `src/panel/ThemePanelProvider.ts` must exist (you're replacing it).

1. **Imports + constructor.** The profile-list import changes from M3's `GENERATIVE` to **`PROFILES`** (all 13, so
   the 4 signature styles appear), and the constructor now takes **`extensionUri`** first, then `history`. (M5 will
   insert `context` in the middle.) At the **top of the file**, and as the class's constructor:
   ```ts
   import * as vscode from 'vscode';
   import { ThemeHistory } from '../theme/history';
   import { applyChrome } from '../theme/apply';
   import { COMBOS, comboById } from '../engine/combos';
   import { PROFILES, profileById } from '../engine/profiles';
   import { generate } from '../engine/generate';
   import { contrastRatio } from '../engine/color';

   export class ThemePanelProvider implements vscode.WebviewViewProvider {
     public static readonly viewType = 'vanCode.panel';

     private view?: vscode.WebviewView;

     constructor(
       private readonly extensionUri: vscode.Uri,
       private readonly history: ThemeHistory,
     ) {}
   ```
2. **`resolveWebviewView`** now takes just `(webviewView)` — the two unused `_context`/`_token` params from M1–M3
   are dropped (TypeScript lets you omit trailing params you don't use; a tidy-up, not a behavior change). It stores
   the view (`this.view`) so the extension can push messages later, and sets
   **`localResourceRoots: [Uri.joinPath(extensionUri, 'media')]`** alongside `enableScripts`. A tiny **`post()`**
   helper wraps `this.view?.webview.postMessage(...)`. As the next two class members:
   ```ts
     resolveWebviewView(webviewView: vscode.WebviewView): void {
       this.view = webviewView;
       webviewView.webview.options = {
         enableScripts: true,
         localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
       };
       webviewView.webview.html = this.getHtml(webviewView.webview);
       webviewView.webview.onDidReceiveMessage((m) => this.onMessage(m));
     }

     private post(message: unknown): void {
       this.view?.webview.postMessage(message);
     }
   ```
3. **`onMessage`** handles the M4 protocol: **`ready`** → post `init` (combos + all **`PROFILES`**); **`apply`** →
   generate, apply chrome via history, then post **`applied`** with the palette and the rounded text-on-background
   contrast; **`revert`**/**`reset`** unchanged. Note the apply is still **`applyChrome(theme.chrome)`** — chrome
   only, no tokens (`applyTheme` arrives in M5). As the next class member:
   ```ts
     private async onMessage(m: any): Promise<void> {
       switch (m.type) {
         case 'ready':
           this.post({
             type: 'init',
             combos: COMBOS.map((c) => ({ id: c.id, label: c.label })),
             profiles: PROFILES.map((p) => ({ id: p.id, label: p.label, family: p.family, variants: p.variants })),
           });
           break;
         case 'apply': {
           const theme = generate(comboById(m.comboId), profileById(m.profileId), m.variant);
           await this.history.apply(() => applyChrome(theme.chrome));
           this.post({
             type: 'applied',
             palette: theme.palette,
             contrast: Math.round(contrastRatio(theme.palette.text, theme.palette.bg) * 100) / 100,
           });
           break;
         }
         case 'revert':
           await this.history.revert();
           break;
         case 'reset':
           await this.history.reset();
           break;
       }
     }
   ```
4. **`getHtml`** returns a shell (`<div id="app">` + external `<link>`/`<script>` built with `asWebviewUri`), and
   the CSP drops `'unsafe-inline'` from `style-src` (the styles are an external file now). As the last class member
   (followed by the unchanged `getNonce()` from the checkpoint):
   ```ts
     private getHtml(webview: vscode.Webview): string {
       const nonce = getNonce();
       const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'main.js'));
       const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'styles.css'));
       return `<!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <meta http-equiv="Content-Security-Policy"
       content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
     <link href="${styleUri}" rel="stylesheet" />
     <title>Van Code</title>
   </head>
   <body>
     <div id="app"></div>
     <script nonce="${nonce}" src="${scriptUri}"></script>
   </body>
   </html>`;
     }
   ```
5. Leave **`getNonce()`** exactly as M3 wrote it (it's in the checkpoint). Save.

### B. `src/extension.ts` — pass `extensionUri` in
6. Open `src/extension.ts` and **replace M3's provider-construction line**
   `const provider = new ThemePanelProvider(history);` with the version that passes `context.extensionUri`
   **first**, then the existing `history`. It's the only place that line occurs, so the anchor is unambiguous. The
   argument **order matters** — it must match the constructor from part A (`extensionUri, history`):
   ```ts
   const provider = new ThemePanelProvider(context.extensionUri, history);
   ```
   Everything else stays as M2/M3 left it: `history` is still created, the `registerWebviewViewProvider` call and
   `context.subscriptions.push(...)` are unchanged, `deactivate` stays empty. (The complete file is in
   [the M4 checkpoint](05_verify.md) under `### src/extension.ts (M4)`.)
7. Save; it recompiles. There should now be **no compile errors anywhere**.

> Forward note (no action): in M5 the constructor gains `context` for `globalState` — the extension's built-in
> key→value store that VS Code persists across reloads (used to save named sets; taught in full in
> [M5 step 05](../MILESTONE_5_tokens-and-persistence/05_storage.md)) — becoming
> `new ThemePanelProvider(context.extensionUri, context, history)`. Not now — M4 needs only `extensionUri`.

> Why post the **`family`** and **`variants`** in `init`? The webview needs `variants` to know whether to draw the
> variant row (Game Boy, Terminal, Nature), and `family` is forwarded for M5's UI grouping. The provider owns the
> data; the webview just renders it — that's the data-driven split from step 03.

## Done when (this step)
- `src/panel/ThemePanelProvider.ts` matches the checkpoint version, and `src/extension.ts` constructs the provider
  as `new ThemePanelProvider(context.extensionUri, history)`.
- **`npm run compile` reports 0 errors** — the whole project builds.
- The extension is now fully wired. Quick smoke test: press <kbd>F5</kbd>, open Van Code, and confirm you see **chip
  rows** rather than a blank panel or M3's dropdowns. The full init/apply/applied walkthrough is the milestone gate
  in [step 05](05_verify.md).

## If it breaks
- **`Property 'extensionUri' has no initializer` / ctor errors** → make sure both constructor params use the
  `private readonly` shorthand exactly as shown; the class fields are declared by that shorthand.
- **`Expected 2 arguments, but got 1`** → part B wasn't applied; `extension.ts` still has the M3 call
  `new ThemePanelProvider(history)`.
- **Arguments in the wrong order (`history, context.extensionUri`)** → TypeScript will complain that a
  `ThemeHistory` isn't a `Uri`; match part A's signature — `extensionUri` first.
- **Panel blank at F5** → almost always `localResourceRoots` not covering `media`, or a CSP mismatch — see the
  troubleshooting table in [05_verify.md](05_verify.md).

---
> Nav: [← The gallery script](03_main-js.md) · [Overview](00_overview.md) · [Verify + reality check →](05_verify.md)
