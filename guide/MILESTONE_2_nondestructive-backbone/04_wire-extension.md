# M2 · Step 04 of 6 — Instantiate the history and inject it into the provider
> Nav: [← History](03_history.md) · [Overview](00_overview.md) · [Panel buttons →](05_panel-buttons.md)

## Why / design
The `ThemeHistory` must be created **once** and shared, so every apply/revert/reset pushes and pops the *same* undo
stack. The right place to create it is `activate` — the function VS Code runs when the extension wakes up (from M1).
We create one `history` there and hand it to the panel provider via its constructor, so the provider can call
`history.apply(...)` when a button is clicked.

This is dependency injection in the plainest sense: `activate` owns the single `ThemeHistory` and passes it in,
rather than the provider making its own.

> 📌 **Why this step touches two files.** Changing what `new ThemePanelProvider(...)` is called with is only half a
> change — the *other* half is the constructor that receives it. Split across two steps, the project would sit
> broken in between ("Expected 0 arguments, but got 1"), and a real mistake of yours would hide inside an error the
> guide told you to expect. So both halves land here, and **this step ends with the project compiling clean.** The
> provider's *behaviour* (buttons, message handling, HTML) is still step 05 — that part breaks nothing.
> *(TS reminder — `private readonly history: ThemeHistory` in the constructor's parameter list declares the field
> **and** assigns it, in one line.)*

## Do this
This step **edits two files**: `src/extension.ts` (the M1 version from
[step 07](../MILESTONE_1_scaffold-sidebar/07_register-provider.md)) and `src/panel/ThemePanelProvider.ts` (the M1
version from [step 06](../MILESTONE_1_scaffold-sidebar/06_provider.md)) — a call site and the signature it calls.

> **Before you start:** steps 01–03 are saved and compiling — `src/theme/settings.ts`, `apply.ts` and `history.ts`
> all exist. `src/extension.ts` is still M1's version, whose `activate` reads
> `const provider = new ThemePanelProvider();`.

**Load-bearing:** the provider receives `history` — `new ThemePanelProvider(history)`. The import path
`./theme/history` and the class name `ThemeHistory` must match step 03.

### A. `src/extension.ts` — create the history and pass it in
Leave the registration line and `deactivate` exactly as M1 wrote them
(`registerWebviewViewProvider(ThemePanelProvider.viewType, provider)`, still pushed onto `context.subscriptions`).

**1. Add the history import**, immediately after the `import { ThemePanelProvider } from './panel/ThemePanelProvider';` line:
```ts
import { ThemeHistory } from './theme/history';
```

**2. Create the shared history and inject it** — inside `activate`, replace the line `const provider = new ThemePanelProvider();` with these two lines:
```ts
  const history = new ThemeHistory();
  const provider = new ThemePanelProvider(history);
```

### B. `src/panel/ThemePanelProvider.ts` — receive it
**3. Add the import**, immediately after the existing `import * as vscode from 'vscode';` line at the top of the file:
```ts
import { ThemeHistory } from '../theme/history';
```
(`../theme/history` — the provider lives in `src/panel/`, so the `theme/` folder is one level up.)

**4. Add the constructor** as the first member **directly below the `public static readonly viewType = 'vanCode.panel';` line** — that line occurs once, so the anchor is unambiguous:
```ts
  constructor(private readonly history: ThemeHistory) {}
```
Nothing else in the provider changes this step: `resolveWebviewView` and `getHtml` stay exactly as M1 left them.
The field is declared but not yet used — step 05 is what calls `this.history`.

5. Save both files. If the `watch` task is running it recompiles; otherwise run `npm run compile`.

*(The complete `src/extension.ts` and `src/panel/ThemePanelProvider.ts` for M2 are shown whole in [06_verify.md](06_verify.md).)*

## Done when (this step)
- `src/extension.ts` creates one `ThemeHistory` and passes it to `new ThemePanelProvider(history)`.
- `src/panel/ThemePanelProvider.ts` has the `constructor(private readonly history: ThemeHistory) {}` line.
- **`npm run compile` reports 0 errors** — the whole project builds. (A lint *hint* that `history` is declared but
  never read is expected and correct; step 05 uses it.)
- Behaviour is unchanged from M1: pressing <kbd>F5</kbd> still opens the panel with M1's ping button. Nothing new is
  observable yet — this step is wiring, and step 05 is what makes it do something.

## If it breaks
- **`Expected 0 arguments, but got 1`** → part B wasn't applied, or the constructor landed outside the class body.
  It must sit **inside** `class ThemePanelProvider { … }`, right under the `viewType` line.
- **`Cannot find module './theme/history'`** (in `extension.ts`) → the path is wrong or `history.ts` wasn't saved.
  It's `./theme/history`, no `.ts`, matching the file from step 03.
- **`Cannot find module '../theme/history'`** (in the provider) → same file, different relative depth: from
  `src/panel/` it's `../theme/history`, not `./theme/history`.
- **`'history' is declared but its value is never read`** → that's a lint hint, not an error, and it's expected
  until step 05. Don't delete the field.

---
> Nav: [← History](03_history.md) · [Overview](00_overview.md) · [Panel buttons →](05_panel-buttons.md)
