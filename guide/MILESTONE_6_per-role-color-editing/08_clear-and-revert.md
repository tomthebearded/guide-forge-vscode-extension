# M6 · Step 08 of 10 — Un-pin one role, clear them all, and how this meets Revert / Reset
> Nav: [← Token + semantic rows](07_webview-token-editor.md) · [Overview](00_overview.md) · [Saved sets remember overrides →](09_persist-overrides.md)

## Why / design
The pickers work; what's missing is a way to see and undo them *as a set*. This step adds a footer to the
Fine-tune section — a **`N pinned`** badge and a **Clear all overrides** button — and, more importantly, settles a
question the reader is about to hit: **there are now three different "undo" affordances in this panel, and they
undo three different things.**

| Control | What it actually does | Does it touch your pins? |
|---|---|---|
| **↺** on a row | deletes that one role from `state.overrides`, then applies | yes — removes exactly one |
| **Clear all overrides** | replaces `state.overrides` with three empty groups, then applies | yes — removes all |
| **Revert** (M2) | restores the **previous settings snapshot**, one step per click | **no** — pins are webview state, not settings |
| **Reset** (M2) | deletes all three color settings from `settings.json` | **no** — same reason |

The row that surprises people is **Revert**. It is time travel over `settings.json`, not over your intentions: it
puts the *colors* back to what they were one apply ago. Un-pin a role (which is itself an apply, and therefore its
own snapshot) and then hit Revert, and you land back on the pinned colors — because that is genuinely what the
editor looked like one step earlier. Nothing is broken; Revert simply doesn't know what a pin is, and keeping it
that way is why M6 changed **zero lines** in `src/theme/`.

**Reset** is the same story from the other end: it strips the settings, but your pins are still sitting in the
panel, so the next chip you click re-applies them. To genuinely start from a blank slate: **Clear all overrides**,
*then* **Reset**.

> ⚠️ **"I clicked a new style and one color didn't change" is the failure report this feature will generate.**
> That's a pinned role doing exactly its job — `apply()` sends your overrides with every message, so the new style
> is generated *around* them. It's the whole point of the feature, and it is also indistinguishable from a bug at a
> glance, which is precisely why the badge exists: **`3 pinned`** in the footer, bold labels and solid ↺ buttons on
> the rows in question. When a style "won't take", read the badge first.

> 🧠 **New concept — why un-pinning uses `delete` and not `= undefined`.** Both would apply the same colors,
> because [step 02](02_overrides-module.md)'s `isHex` filter drops `undefined` either way. But `countPinned()`
> below counts `Object.keys(...)`, and **`Object.keys` still lists a key whose value is `undefined`** — the key
> exists, it just holds nothing. Assigning `undefined` would leave the badge reading `3 pinned` after you un-pinned
> all three, with three bold labels and no way to make them go away. `delete` removes the key itself, so "cleared"
> and "never touched" stay the *same* state, exactly as step 01 promised. Docs:
> [MDN — `delete`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Operators/delete).

## Do this
This step edits **one file**: `media/webview/main.js`, in **one place** — `renderRoles()` gains a footer — plus one
small function beside it. `roleRow`'s ↺ handler was already wired in step 06 (`delete state.overrides[group][name];
apply();`), so per-row un-pinning needs no new code here. (The complete file is in
[the M6 checkpoint](10_verify.md) under `### media/webview/main.js`.)

> **Before you start:** step 07's gate must pass — 28 pickers across three groups, all applying on `change`.

1. Open `media/webview/main.js` and find `renderRoles()`.
2. **Add the footer.** Immediately **after** the `for (const group of GROUPS) { … }` loop and **before** the
   closing `}` of `renderRoles`, insert:
   ```js
     const pinned = countPinned();
     const footer = el('div', { className: 'row' });
     footer.append(el('span', {
       className: pinned ? 'badge warn' : 'badge muted',
       textContent: pinned + ' pinned',
     }));
     const clearAll = el('button', { className: 'btn', textContent: 'Clear all overrides', disabled: !pinned });
     clearAll.addEventListener('click', () => {
       state.overrides = { palette: {}, tokens: {}, semantic: {} };   // fresh groups, no leftover keys
       apply();
     });
     footer.append(clearAll);
     box.append(footer);
   ```
   `disabled: !pinned` is assigned by `el`'s `Object.assign`, so the button is genuinely disabled (not just styled)
   when there's nothing to clear — a dead click is a small lie about what the UI can do.
3. **Add `countPinned()`** directly below `renderRoles()`. It counts keys across the three groups, and lives in the
   webview because it counts *what the panel is holding*, not what the engine accepted:
   ```js
   function countPinned() {
     return Object.keys(state.overrides)
       .reduce((total, group) => total + Object.keys(state.overrides[group]).length, 0);
   }
   ```
   > 📌 The engine has its own `countOverrides` (step 02) with the stricter definition — *valid hexes* the merge
   > would actually honour. They agree in every normal case; they'd disagree only if the panel held junk it never
   > sent, which `setRole` prevents. Two counters, two owners, no shared state to drift.
4. **Re-clearing state, not mutating it.** Note that **Clear all** assigns three brand-new empty objects rather
   than deleting keys in a loop. Same result, one line, and no chance of leaving a group object behind that some
   later code has a stale reference to.
5. Save.

**Load-bearing:** the three group keys in the fresh object (drop one and the next `roleRow` for that group throws
on `state.overrides[group][name]`); `disabled` as a real DOM property. The badge text, the `warn`/`muted` classes
and the button label are cosmetic.

## Done when (this step)
Press <kbd>F5</kbd>.
- With nothing pinned the footer reads **`0 pinned`** (muted) and **Clear all overrides** is greyed out and
  unclickable.
- Pin three roles from three different groups — say `bg`, `strings`, and the semantic `parameter`. The badge reads
  **`3 pinned`** in amber, the button is enabled, and three labels are bold with solid ↺.
- Click ↺ on `strings` → badge drops to **`2 pinned`**, that row's color returns to the formula's value, the label
  un-bolds and its ↺ goes ghosted. **The other two pins are untouched.**
- Click **Clear all overrides** → badge reads **`0 pinned`**, every row returns to its formula color in one apply,
  the button greys out again.
- **Revert semantics, deliberately:** pin `bg` to red, then click ↺ (colors go back to the formula), then click
  **Revert once** → the editor returns to **red**. That is correct: Revert steps back one settings snapshot, and one
  snapshot ago the background was red. The badge still reads `0 pinned` — the settings moved, your pins didn't.
- **Reset semantics:** with 2 roles pinned, click **Reset** → `settings.json` loses all three color keys. Now click
  any Style chip → the theme comes back **with your 2 pins still applied**. Clear all, then Reset, for a true blank
  slate.
- **One snapshot per action, still:** pin a role, then click **Revert** once → exactly one step back, not several.
  If Revert needs many clicks, you're on `input` instead of `change` (step 06).

## If it breaks
- **The badge never drops back to 0** → an un-pin is assigning `undefined` instead of `delete`-ing the key; see the
  concept note above. Check `roleRow`'s ↺ handler reads `delete state.overrides[group][name];`.
- **Clear all does nothing** → `apply()` isn't being called after the reassignment, or the button is disabled
  because `countPinned()` returned 0 (which it will if it's reading `state.effective` by mistake).
- **`Cannot read properties of undefined` right after Clear all** → the replacement object is missing a group key.
  All three — `palette`, `tokens`, `semantic` — must be present and empty.
- **The button is styled grey but still clickable** → you set a class instead of the `disabled` property.
- **A reader reports "the style chips stopped working"** → check the badge before the code. This is the pinned-role
  behaviour in the warning above, not a regression.

---
> Nav: [← Token + semantic rows](07_webview-token-editor.md) · [Overview](00_overview.md) · [Saved sets remember overrides →](09_persist-overrides.md)
