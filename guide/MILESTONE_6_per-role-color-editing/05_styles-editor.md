# M6 · Step 05 of 10 — Style the role rows
> Nav: [← The provider passes them through](04_provider-overrides.md) · [Overview](00_overview.md) · [Edit the 8 chrome roles →](06_webview-chrome-editor.md)

## Why / design
28 editable roles in a sidebar that is often 300px wide is a layout problem before it's a color problem. Four
things have to sit on one line and stay readable: the role's **name**, its **swatch**, its **hex**, and an
**un-pin** button. A `.row` (flex, wrapping) — M4's workhorse — is wrong here: with 28 of them the wrapping would
be ragged and the columns wouldn't line up, so scanning for "which roles did I pin?" becomes impossible.

So this step adds a **CSS grid** with four columns, sized `1fr auto auto auto`: the name takes whatever space is
left, the three controls take exactly what they need. Every row shares one grid, so the swatches line up in a
column down the panel and a pinned row is visible at a glance.

> 📌 **Yes, M4 called `styles.css` "the complete, final stylesheet".** It was — *for M5*, which was the last
> milestone that existed when it was written, and M5 indeed never touched it. M6 is a new feature with new UI, so
> it appends new rules. Nothing already in the file changes: the chips, swatch strip, badges, `.text` inputs and
> `.muted` empty state all stay exactly as they are, and the rules below only add class names M4 never used.

> 🧠 **New concept — `<input type="color">`.** The browser's native color control: it renders as a small swatch,
> opens the operating system's color picker when clicked, and its `value` is **always** a lowercase `#rrggbb`
> string. That last part is why step 02's regex is exactly 7 characters — it's the shape this control speaks. It
> ignores any value that isn't valid `#rrggbb` (falling back to `#000000`), which is why the engine's colors reach
> it already validated. Webviews are ordinary Chromium pages, so it works with no VS Code API at all. Docs:
> [MDN — `<input type="color">`](https://developer.mozilla.org/docs/Web/HTML/Element/input/color).

> 🧠 **New concept — `<details>` / `<summary>`.** The browser's built-in disclosure widget: everything inside
> `<details>` is hidden until the user clicks the `<summary>` line. No JavaScript, no state to track. Step 07 wraps
> the 13 semantic types in one so the panel opens at a manageable length — the 15 roles a reader tunes constantly
> stay visible, the 13 they rarely touch stay one click away. Docs:
> [MDN — `<details>`](https://developer.mozilla.org/docs/Web/HTML/Element/details).

Everything here reads VS Code's theme variables (`var(--vscode-…)`, M4 step 02) so the editor UI restyles itself
with the user's theme — which is worth noticing, because it's the one part of this panel your generated colors
*don't* control.

## Do this
This step edits **one file**: `media/webview/styles.css` — the M4 stylesheet, unchanged since M4. You **append**;
you don't rewrite. (The complete file is in [the M6 checkpoint](10_verify.md) under `### media/webview/styles.css`.)

> **Before you start:** `media/webview/styles.css` must be at its M4 state, ending with the `.muted { opacity: .6; }`
> rule. If your file already has `.roles` in it, you've run this step before — don't append twice.

1. Open `media/webview/styles.css`.
2. **Append the block below to the end of the file**, after `.muted`. Leave every existing rule alone.
   ```css
   /* --- M6: the per-role editor ------------------------------------------------ */
   .roles { display: grid; grid-template-columns: 1fr auto auto auto; gap: 4px 6px; align-items: center; }
   .role { font-size: 11px; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
   .role.pinned { opacity: 1; font-weight: 600; }
   input[type="color"] {
     width: 26px; height: 22px; padding: 0; cursor: pointer; background: none;
     border: 1px solid var(--vscode-input-border, #3c3c3c); border-radius: 4px;
   }
   .hex {
     width: 76px; box-sizing: border-box; padding: 2px 4px; font-size: 11px;
     font-family: var(--vscode-editor-font-family, monospace);
     background: var(--vscode-input-background); color: var(--vscode-input-foreground);
     border: 1px solid var(--vscode-input-border, #3c3c3c); border-radius: 4px;
   }
   .hex.invalid { border-color: #b62324; }
   .clear {
     font: inherit; font-size: 12px; line-height: 1; cursor: pointer; padding: 2px 5px;
     border: none; border-radius: 4px; background: none; color: var(--vscode-foreground); opacity: .35;
   }
   .clear.on { opacity: 1; background: var(--vscode-button-secondaryBackground, #2a2d2e); }
   details > summary {
     cursor: pointer; margin: 12px 0 6px; font-size: 11px;
     text-transform: uppercase; letter-spacing: .04em; opacity: .8;
   }
   ```
3. Read the four rules that carry meaning later, so the JavaScript in steps 06–08 reads as wiring rather than
   magic — each is a **class the script toggles to mirror state**:
   - **`.role.pinned`** — bolder, fully opaque. Added by step 06 when that role has an override, so "which of these
     did I change?" is answerable without opening anything.
   - **`.hex.invalid`** — a red border. Added by step 06 when you type something that isn't a color; it clears at
     the next apply.
   - **`.clear.on`** — the ↺ button goes from ghosted to solid, so an un-pinnable row advertises itself. A row with
     no override still shows the button (the grid column must not collapse) but at 35% opacity.
   - **`input[type="color"]`** is styled by **element**, not by class — it's the only control of its kind in the
     panel, and giving it a class would mean remembering to add it 28 times.
4. Save. **Nothing changes in the panel yet** — no element uses these classes until step 06.

**Load-bearing:** the class names `roles`, `role`, `pinned`, `hex`, `invalid`, `clear`, `on` — steps 06–08 set
exactly these strings, and CSS fails silently on a mismatch (you'd get an unstyled, still-working editor). The
`grid-template-columns` value must stay **four** entries, matching the four nodes step 06 appends per row.
Everything else — colors, sizes, the `.35` opacity, the comment banner — is cosmetic.

## Done when (this step)
- `media/webview/styles.css` ends with the M6 block and still contains all of M4's rules above it.
- Press <kbd>F5</kbd>: the panel looks **exactly as it did in M5** — chips, swatch strip, contrast badge, language
  box, My sets. New CSS with no matching elements has no effect, which is the expected result of this step.

## If it breaks
- **The panel lost its styling entirely** → you replaced the file instead of appending to it. Restore M4's rules
  from [the M4 checkpoint](../MILESTONE_4_gallery-and-ux/06_verify.md) and append again.
- **A stray `}` / the file's last rules stopped applying** → CSS has no error reporting; one unbalanced brace kills
  everything after it. Re-check the block you pasted, especially the multi-line `input[type="color"]`, `.hex` and
  `.clear` rules.
- **You want to preview the rules now** → you can't usefully; there's no markup for them. Step 06 renders the first
  8 rows and that's the moment to judge the layout (and to widen `.hex` if your font renders 7 characters wider).

---
> Nav: [← The provider passes them through](04_provider-overrides.md) · [Overview](00_overview.md) · [Edit the 8 chrome roles →](06_webview-chrome-editor.md)
