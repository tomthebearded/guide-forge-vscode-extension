# M7 · Step 01 of 2 — Add `publisher` and package the `.vsix`
> Nav: — · [Overview](00_overview.md) · [Install it and finish →](02_verify.md)

## Glossary for this step
- **`.vsix`** — the zip-format package file a VS Code extension ships as; produced by `vsce package` and installable via **Extensions: Install from VSIX…**. *(Introduced here.)*

## Why / design
The finish line is a **`.vsix`** — a single installable file containing your compiled extension. It's produced by
`@vscode/vsce` (the packaging CLI), and `vsce package` needs one manifest field it doesn't have yet: a
**`publisher`**.

> 🧠 **New concept — the `publisher` id.** On the Marketplace an extension is identified as `publisher.name`
> (e.g. `ms-python.python`). Even though we're **not** publishing (that's out of scope), `vsce package` still
> **requires** a `publisher` in `package.json` and **errors out without one**: `ERROR Missing publisher name`.
> For a local package the value is arbitrary — any lowercase id works. We use `"publisher": "example"`. Its
> *presence* is load-bearing (packaging fails without it); the *value* is cosmetic here (it only matters if you
> later publish, which needs a registered publisher). Docs:
> [Publishing Extensions — publisher](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions).

We also add a **`repository`** field. It's not required — its absence produces a *warning*, not an error — but
adding it silences that warning and is good hygiene.

> `@vscode/vsce` is the renamed package (the old bare `vsce` is deprecated); the **command** you type is still
> `vsce`. See [stack.md](../foundation/stack.md). (npm/vsce is **Intermediate** — one-liners below, no deep dive.)

## Do this
This step edits **one file** (`package.json`) then runs two commands.

> **Before you start:** M6 must be green and the extension must **compile clean** — `vsce package` runs
> `vscode:prepublish` (→ `npm run compile`) first and aborts on any TypeScript error.

1. Open `package.json`.
2. **Add** two fields — `"publisher": "example"` (any lowercase id) and a `"repository"` object — **directly after
   the `"version": "0.0.1",` line**. Touch nothing else: the dependency versions and every other field (name,
   engines, contributes, scripts, devDependencies) stay **exactly as M1 scaffolded them**. (The complete final
   `package.json` is in [the M7 checkpoint](02_verify.md) under `### package.json`.)
   ```jsonc
   "publisher": "example",
   "repository": {
     "type": "git",
     "url": "https://github.com/example/van-code"
   },
   ```
3. Save.
4. Install the packaging CLI (once) and package. From the project root terminal:
   ```powershell
   npm install -g @vscode/vsce   # or, no global install: npx @vscode/vsce package
   vsce package
   ```
5. `vsce package` runs `vscode:prepublish` (→ `npm run compile`) first, then zips the extension. Expected final
   line: **`Packaged: …\van-code\van-code-0.0.1.vsix`**. The file appears in the project root.

**Load-bearing:** the **presence** of `publisher`; the emitted filename `van-code-0.0.1.vsix` is derived from
`name` (`van-code`) + `version` (`0.0.1`) — both already fixed since M1. The `publisher` value and the
`repository` URL are cosmetic.

## Done when (this step)
- `vsce package` completes and prints a line ending in **`van-code-0.0.1.vsix`**.
- The file **`van-code-0.0.1.vsix`** exists in the project root — `Get-ChildItem *.vsix` on Windows/PowerShell,
  `ls *.vsix` on macOS/Linux.
- Don't install it yet — step 02 installs it deliberately, in an ordinary (undebugged) window, because *where* you
  install it is what proves the last open item in the guide.

## If it breaks
| Symptom | Usual cause | Fix |
|---------|-------------|-----|
| `ERROR Missing publisher name` | no `publisher` in `package.json` | add `"publisher": "example"` (presence, not value) |
| `WARNING ... repository field missing` | no `repository` | harmless warning; add the `repository` object to silence it |
| `WARNING A 'LICENSE' file was not found` | no LICENSE | warning only; add a `LICENSE` file if you care, not required to package |
| `ERROR @types/vscode ^x < engines.vscode ^y` | `@types/vscode` lower than `engines.vscode` | keep both at `^1.128.0` (they match by design) |
| `vsce: command not found` | CLI not installed | `npm install -g @vscode/vsce`, or use `npx @vscode/vsce package` |
| compile error during packaging | `vscode:prepublish` runs `tsc` and it failed | fix the TypeScript error `vsce` prints, then re-run |
| `.vsix` missing `media/webview/*` at runtime | `.vscodeignore` dropped it | our webview lives under `media/` (not `src/`), so the default ignore keeps it — confirm the files are under `media/webview/` |

---
> Nav: — · [Overview](00_overview.md) · [Install it and finish →](02_verify.md)
