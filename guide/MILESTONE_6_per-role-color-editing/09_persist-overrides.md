# M6 · Step 09 of 10 — Saved sets remember their overrides
> Nav: [← Un-pin and clear all](08_clear-and-revert.md) · [Overview](00_overview.md) · [Verify the milestone →](10_verify.md)

## Why / design
A saved set is currently a **frozen result**: M5 stores the finished `chrome` / `tokens` / `semantic` maps, so
re-applying it repaints the editor perfectly. What it can't do is put you back in the *editing* position — the
panel has no idea which roles you had pinned, so the pickers come back empty and your next click un-does an hour of
tuning. This step closes that: one optional field on `SavedSet`, and one new message so the panel can be restored.

Two design points, both about **not** rewriting M5:

- **We keep applying the frozen colors, and regenerate only for display.** `applySet` still writes the stored maps
  — a set saved today keeps applying identically even if you later change a profile's math, which is the whole
  reason M5 froze them. Alongside that, the provider regenerates from `comboId + profileId + variant + overrides`
  purely to produce the **effective** colors the pickers need to show. Applying the past, displaying the present.
- **`src/storage/sets.ts` needs one line.** `listSets` / `saveSet` / `deleteSet` / `exportSets` / `importSets` all
  move whole `SavedSet` objects around — `globalState.update`, `JSON.stringify`, `JSON.parse` — none of them names
  a field. Add the field to the interface and export/import carry it for free. That's the dividend of a
  shape-agnostic storage layer.

> 🧠 **New concept — the `restore` message (extension → webview).** Every message so far has been either the
> webview asking for something (`apply`, `save`, `applySet`) or the extension answering (`applied`, `savedSets`).
> `restore` is different: it's the extension *setting the panel's state*, because applying a saved set changes
> which combo, style, variant **and** pins the panel should be showing, and only the extension knows what was in
> the set. It carries the full picture — selection + overrides + all three effective maps + contrast — so the
> webview can redraw once and be correct, rather than round-tripping. Like every other type string
> (`ready`/`init`/`apply`/`applied`/`savedSets`), the literal `'restore'` must match on both sides or the message is
> silently ignored.

> 📌 **An old set has no `overrides` key, and that's fine.** The field is optional. A set saved before this step —
> or a `sets.json` a friend exported from M5 — parses cleanly, applies exactly as it did, and re-opens with empty
> pickers. There is no migration, no version field, no upgrade path to write, because "absent means the formula
> owns every role" is the same rule the whole feature already runs on.

## Do this
This step edits **three files**: `src/storage/sets.ts` (one field), `src/panel/ThemePanelProvider.ts` (two cases),
and `media/webview/main.js` (one message branch). (All three complete files are in
[the M6 checkpoint](10_verify.md).)

> **Before you start:** steps 04 and 06–08 must be working — the provider must already remember
> `this.last.overrides` (step 04, point 3), or `save` has nothing to store.

### A. `src/storage/sets.ts` — one field
1. Open `src/storage/sets.ts`.
2. **Widen the types import** to bring in `ThemeOverrides`. Replace the existing engine-types import line with:
   ```ts
   import { ChromeColors, TokenColors, SemanticColors, ThemeOverrides } from '../engine/types';
   ```
3. **Add the field to `SavedSet`**, directly below `variant?`. Optional, so every existing set stays valid:
   ```ts
     overrides?: ThemeOverrides;
   ```
4. **Change nothing else in this file.** The five functions below the interface stay byte-for-byte as M5 wrote
   them.

### B. `src/panel/ThemePanelProvider.ts` — store it, and restore it
5. **Replace the body of `case 'save'`** so the regenerate uses the pins and the set records them:
   ```ts
   case 'save': {
     if (!this.last || !m.name) return;
     const theme = generate(
       comboById(this.last.comboId), profileById(this.last.profileId), this.last.variant, this.last.overrides,
     );
     const set: SavedSet = {
       name: m.name, comboId: this.last.comboId, profileId: this.last.profileId, variant: this.last.variant,
       overrides: this.last.overrides,
       chrome: theme.chrome, tokens: theme.tokens, semantic: theme.semantic,
     };
     await saveSet(this.context, set);
     this.post({ type: 'savedSets', savedSets: listSets(this.context).map((s) => s.name) });
     break;
   }
   ```
   Without the 4th argument here, **Save** would freeze the un-pinned formula colors while the editor showed your
   pinned ones — a set that doesn't look like what you saved.
6. **Replace the body of `case 'applySet'`** so it also restores the panel:
   ```ts
   case 'applySet': {
     const set = listSets(this.context).find((s) => s.name === m.name);
     if (!set) return;
     this.last = { comboId: set.comboId, profileId: set.profileId, variant: set.variant, overrides: set.overrides };
     await this.history.apply(() => applyTheme(set));   // apply the FROZEN colors, exactly as M5 did
     // …then regenerate purely to tell the panel what each role currently is
     const theme = generate(comboById(set.comboId), profileById(set.profileId), set.variant, set.overrides);
     this.post({
       type: 'restore',
       comboId: set.comboId, profileId: set.profileId, variant: set.variant,
       overrides: set.overrides || {},
       palette: theme.palette, tokens: theme.tokens, semantic: theme.semantic,
       contrast: worstTextContrast(theme.chrome),
     });
     break;
   }
   ```
   Setting `this.last` matters as much as the message: without it, clicking a saved set and then **Save set…**
   under a new name would store whatever you had selected *before*.
7. Save both files and run `npm run compile`.

### C. `media/webview/main.js` — handle `restore`
8. Open `media/webview/main.js` and **add a `restore` branch** to the message listener, directly after the
   `savedSets` branch:
   ```js
   } else if (msg.type === 'restore') {
     state.comboId = msg.comboId;
     state.profileId = msg.profileId;
     state.variant = msg.variant || null;
     state.overrides = { palette: {}, tokens: {}, semantic: {}, ...(msg.overrides || {}) };
     state.effective = { palette: msg.palette, tokens: msg.tokens, semantic: msg.semantic };
     render();                                    // redraw chips + rows against the restored state
     renderPreview(msg.palette, msg.contrast);    // render() leaves #preview empty; fill it
   ```
   The spread over three empty groups is what guarantees all three keys exist even when the set only pinned
   palette roles — the same pre-shaping rule as step 06, applied to data arriving from outside.
   **`render()` must not be followed by `apply()` here**: the provider already applied the set. Re-applying would
   push a second history snapshot for one click — M4's R10 rule, in a new place.
9. Save.

**Load-bearing:** the message type string `'restore'` (both sides); the field name `overrides` on `SavedSet` (it's
the JSON key in `globalState` and in exported files); passing `this.last.overrides` as `generate`'s 4th argument in
`case 'save'`. The comments and the `|| {}` fallbacks' style are cosmetic.

## Done when (this step)
Press <kbd>F5</kbd>.
- Pin 3 roles (mixed groups), type `pinned-navy` in the set-name box, click **Save set…** → it appears under
  **My sets**.
- Click a different **Style** chip, then **Clear all overrides** → badge `0 pinned`, a completely different theme.
- Click **`pinned-navy`** under My sets → the editor returns to the saved theme, **the combo/style chips
  re-highlight to the set's own selection**, the badge reads **`3 pinned`** again, and the three rows come back
  bold with their exact hexes in the boxes.
- Click **Revert** once right after that → exactly one step back (one snapshot for the whole restore, not two).
- **Reload check:** Command Palette → **Developer: Reload Window**, then click `pinned-navy` again → same result.
  The overrides came out of `globalState`, not memory.
- **Export check:** click **Export** → in the JSON tab, the `pinned-navy` object has an `"overrides"` key
  containing only the roles you pinned, e.g.
  ```json
  "overrides": { "palette": { "bg": "#0a0f1e" }, "tokens": { "strings": "#ff00aa" }, "semantic": { "parameter": "#7fd1b9" } }
  ```
  Delete the set with its ✕, then **Import** the file back → the set returns **with** its pins, and clicking it
  restores all three.

## If it breaks
- **The set applies but the pickers come back empty** → the webview isn't handling `restore` (point 8), or the
  provider isn't sending it (point 6). Check the type string matches on both sides — a mismatch is silent.
- **The badge reads `0 pinned` after restoring, but the colors are right** → `set.overrides` is `undefined`,
  meaning the set was saved before point 5 was applied. Re-save it; there's no migration by design.
- **Saved colors differ from what was on screen when you saved** → `case 'save'` is calling `generate` with three
  arguments. The 4th (`this.last.overrides`) is what makes the frozen maps match the editor.
- **`Property 'overrides' does not exist on type 'SavedSet'`** → part A wasn't saved, or the field landed in the
  wrong interface. It goes on `SavedSet` in `src/storage/sets.ts`.
- **Clicking a saved set needs two Reverts to undo** → the webview called `apply()` after `render()` in the
  `restore` branch. Remove it; the provider already applied.
- **`"overrides"` is missing from the exported JSON** → `JSON.stringify` omits fields whose value is `undefined`.
  A set with no pins genuinely has none — that's correct output, not a bug. Pin something and re-save to see it.

---
> Nav: [← Un-pin and clear all](08_clear-and-revert.md) · [Overview](00_overview.md) · [Verify the milestone →](10_verify.md)
