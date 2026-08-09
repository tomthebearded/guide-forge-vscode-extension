# M6 · Step 06 of 10 — The webview holds overrides + effective colors, and edits the 8 chrome roles
> Nav: [← Style the role rows](05_styles-editor.md) · [Overview](00_overview.md) · [Token + semantic rows →](07_webview-token-editor.md)

## Glossary for this step
- **[Role override](../foundation/glossary.md#role-override)** — one hand-picked color pinned to a named role.
  *(Defined in step 01; this is the step where the reader can finally create one.)*
- **[Effective color](../foundation/glossary.md#effective-color)** — what a role ended up being after the formula
  ran and the overrides were layered on. *(Defined in step 04; arrives on every `applied` message.)*

## Why / design
This is the biggest step in M6 and the one that makes it real: at the end of it, dragging a picker recolors your
editor. It adds **two objects to `state`** and **two functions**, and the two objects are worth understanding
before you type anything, because every other decision in the milestone follows from the split:

| `state.overrides` | `state.effective` |
|---|---|
| what **you** pinned — sparse, often empty | what the theme **is** — always all 28 roles |
| owned by the webview; sent up on every `apply` | owned by the extension; arrives on every `applied` |
| survives a style change | replaced wholesale by a style change |
| a role leaves it when you un-pin (step 08) | never has holes |

A row displays `overrides[group][role] ?? effective[group][role]` — your color if you pinned one, the formula's
otherwise. Nothing else needs deciding, and the webview still knows no color math whatsoever.

> ⚠️ **`change`, not `input` — this is the rule that keeps M2's backbone honest.** A native color picker fires
> **`input`** continuously while you drag the hue slider: dozens to hundreds of events per gesture. Our `apply()`
> posts a message, and the provider wraps every apply in `history.apply(...)`, which **takes a snapshot**. Wiring
> to `input` would push ~200 snapshots for one drag, and the first **Revert** would look completely inert — the
> exact failure M4's step 03 already fought once (`render()` must not call `apply()`). The `change` event fires
> **once**, when the picker is dismissed or the text field is left. One deliberate action → one apply → one
> snapshot. → [D10](../foundation/decision-log.md#d10--role-edits-commit-on-change-not-on-input)

> 🧠 **New concept — `??` vs `||` when the value is a color string.** `a ?? b` yields `b` only when `a` is `null`
> or `undefined`; `a || b` yields `b` for **any** falsy `a`, including `''`. We use `??` so that the day a bug puts
> an empty string in `state.overrides`, the row shows the empty value and you *see* the bug, instead of `||`
> silently papering over it with the effective color. (`state.languageId || undefined` in `apply()` keeps `||` on
> purpose — there, an empty box genuinely means "no language".) Docs:
> [MDN — nullish coalescing](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing).

The 8 role **names** are not typed anywhere in this file: `renderRoles` iterates `Object.keys(state.effective.palette)`,
i.e. whatever the extension just sent. Add a 9th palette role to the engine one day and a 9th picker appears with
no webview edit — the same data-driven contract M4 set for the profile chips.

## Do this
This step edits **one file**: `media/webview/main.js` — the M5 final webview. Six regions change: `state`, the
`applied` branch of the message listener, `apply()`, the `render()` body (one new container + one new call), and
two new functions at the bottom. Everything else — `el`, `section`, `renderPreview`, `renderSaved`, the chips, the
language box, Save/Export/Import — is untouched. (The complete file is in [the M6 checkpoint](10_verify.md) under
`### media/webview/main.js`.)

> **Before you start:** step 04 must be compiled and running, so `applied` messages actually carry `tokens` and
> `semantic`; step 05's CSS must be appended, or the rows will render unstyled (and unreadable at 28 rows).
> `media/webview/main.js` must be at its M5 state.

1. **Add the two objects to `state`.** Both are pre-shaped with all three group keys so no code ever has to
   check whether a group exists. Replace the `const state = …` line with:
   ```js
   const state = {
     combos: [], profiles: [], savedSets: [],
     comboId: null, profileId: null, variant: null, languageId: '',
     overrides: { palette: {}, tokens: {}, semantic: {} },   // what you pinned — sparse
     effective: { palette: {}, tokens: {}, semantic: {} },   // what the theme is — from `applied`
   };
   ```
2. **Store the effective colors and redraw the rows** when `applied` arrives. Replace the `else if (msg.type === 'applied')`
   branch of the message listener with:
   ```js
   } else if (msg.type === 'applied') {
     state.effective = { palette: msg.palette, tokens: msg.tokens, semantic: msg.semantic };
     renderPreview(msg.palette, msg.contrast);
     renderRoles();
   ```
   Note it assigns a **whole new object** rather than merging: the extension is the authority on effective colors,
   and a stale role left over from the previous style would show a color the editor isn't painted with.
3. **Send the overrides up** on every apply. Replace `apply()` with:
   ```js
   function apply() {
     if (!state.comboId || !state.profileId) return;
     vscode.postMessage({
       type: 'apply', comboId: state.comboId, profileId: state.profileId,
       variant: state.variant || undefined, languageId: state.languageId || undefined,
       overrides: state.overrides,
     });
   }
   ```
   Every existing caller — the combo chips, the style chips, the variant chips, the initial apply in `init` — now
   carries your pins automatically. That single line is why **pinned roles survive a style change**: the new style
   is generated *with* them.
4. **Give the rows a container inside `render()`.** Find the line that appends the preview box —
   `app.append(el('div', { id: 'preview', className: 'section' }));` — and add one line **directly below it**:
   ```js
   app.append(el('div', { id: 'roles', className: 'section' }));
   ```
5. **Draw the rows after the first draw.** `render()` ends with `renderSaved();`. Add one line **directly below
   that**, still inside `render()`:
   ```js
   renderRoles();
   ```
   `render()` stays **pure draw** — it must still not call `apply()`; `renderRoles` only reads state. (M4's R10
   guard is unchanged and still load-bearing.)
6. **Add the group table and `renderRoles()`** at the bottom of the file, **above the final
   `vscode.postMessage({ type: 'ready' });` line**. `GROUPS` gets its other two entries in step 07 — leave it with
   one for now, so you can judge 8 rows before you're looking at 28:
   ```js
   const GROUPS = [
     { key: 'palette', title: 'Fine-tune — chrome roles' },
   ];

   function renderRoles() {
     const box = document.getElementById('roles');
     if (!box) return;
     box.innerHTML = '';
     for (const group of GROUPS) {
       const names = Object.keys(state.effective[group.key] || {});
       if (!names.length) continue;   // nothing applied yet — no colors to show
       const grid = el('div', { className: 'roles' });
       for (const name of names) grid.append(...roleRow(group.key, name));
       box.append(section(group.title, grid));
     }
   }
   ```
7. **Add `roleRow()` and `setRole()`** directly below `renderRoles()`. `roleRow` returns the **four** grid cells
   for one role — matching step 05's four columns — and is the only place the `change`-not-`input` rule is spelled
   out in code:
   ```js
   function roleRow(group, name) {
     const pinned = state.overrides[group][name];
     const shown = pinned ?? state.effective[group][name];

     const label = el('span', { className: pinned ? 'role pinned' : 'role', textContent: name, title: name });

     // 'change' (picker dismissed), NOT 'input' (fires all through the drag) — one apply, one snapshot.
     const swatch = el('input', { type: 'color', value: shown });
     swatch.addEventListener('change', () => setRole(group, name, swatch.value));

     const hex = el('input', { type: 'text', className: 'hex', value: shown, spellcheck: false });
     hex.addEventListener('change', () => {
       const typed = hex.value.trim().toLowerCase();
       if (/^#[0-9a-f]{6}$/.test(typed)) setRole(group, name, typed);
       else { hex.classList.add('invalid'); hex.value = shown; }   // reject, keep the color, show why
     });

     const clear = el('button', {
       className: pinned ? 'clear on' : 'clear', textContent: '↺',
       title: pinned ? 'Back to the formula' : 'Not pinned',
     });
     clear.addEventListener('click', () => { delete state.overrides[group][name]; apply(); });

     return [label, swatch, hex, clear];
   }

   function setRole(group, name, hex) {
     state.overrides[group][name] = hex;
     apply();   // the redraw comes from the `applied` reply, not from here
   }
   ```
8. Save. No compile step — `main.js` is plain JavaScript served as a file, not TypeScript.

**Load-bearing:** the event name **`change`** on both inputs (point 7); the `type: 'color'` and `className: 'hex'`
values, which step 05's CSS selects on; the four returned nodes per row; the `overrides` field name on the message
(step 04 reads it). The `↺` glyph, the titles and the group `title` strings are cosmetic.

## Done when (this step)
Press <kbd>F5</kbd> and open the panel.
- A **Fine-tune — chrome roles** section lists **8 rows**: `bg`, `surface`, `surfaceAlt`, `text`, `textMuted`,
  `accent1`, `accent2`, `border` — each with a swatch, a `#rrggbb` box and a ghosted ↺. The swatches match the
  8-chip palette strip directly above them.
- Click `bg`'s swatch, pick a strong color, **dismiss the picker** → the editor background changes immediately,
  **and so do the tabs, sidebar and panel** (they're derived from `bg`), the palette strip redraws, and the
  contrast badge recomputes. The `bg` label goes bold and its ↺ turns solid.
- Watch the drag itself: while the OS picker is open and you're sliding, **nothing applies**. The change lands on
  release. That's `change`, not `input`.
- Type `#ff00aa` into `accent2`'s hex box and press <kbd>Enter</kbd> (or click away) → it applies. Type `banana`
  into it and leave the box → the box takes a **red border**, the value snaps back, and **the editor doesn't
  change**. (The red border clears at the next apply.)
- Click a different **Style** chip → the 25 unpinned roles change, your pinned ones **stay**. Click **Revert**
  once → exactly one step back.
- The token and semantic groups are **not shown yet** — `GROUPS` has one entry. That's step 07.

## If it breaks
- **No Fine-tune section at all** → either `renderRoles()` isn't called at the end of `render()` (point 5), or the
  `#roles` container isn't appended (point 4), or no apply has happened yet so `state.effective.palette` is still
  `{}` — pick any style chip and it appears.
- **The section appears but is empty** → `state.effective` isn't being filled: check that step 04's provider sends
  `tokens`/`semantic` **and** that point 2 assigns `msg.palette` (not `msg.effective`).
- **The editor recolors continuously while you drag, and Revert needs many clicks** → you wired `input` instead of
  `change`. That's the snapshot flood from the warning above; change both listeners.
- **`Cannot read properties of undefined (reading 'bg')`** → `state.overrides` is missing one of its three group
  keys. It must be pre-shaped as `{ palette: {}, tokens: {}, semantic: {} }` (point 1) — the code never guards.
- **The rows are a jumbled column, not a grid** → the wrapper is missing `className: 'roles'`, or step 05's CSS
  wasn't appended, or `roleRow` returns a wrapper element instead of four separate cells (grid children must be the
  cells themselves).
- **Pinning a role then clicking a Style chip clears the pin** → `apply()` isn't sending `overrides` (point 3), so
  the extension regenerates without them.
- **The picker shows black for every role** → `shown` is `undefined` for those roles. `<input type="color">` falls
  back to `#000000` for anything that isn't `#rrggbb`; check the `applied` message is carrying the group you're
  reading.

---
> Nav: [← Style the role rows](05_styles-editor.md) · [Overview](00_overview.md) · [Token + semantic rows →](07_webview-token-editor.md)
