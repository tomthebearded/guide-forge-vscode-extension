# M6 · Step 04 of 10 — The provider passes overrides through and echoes the effective colors back
> Nav: [← Thread them through `generate()`](03_generate-overrides.md) · [Overview](00_overview.md) · [Style the role rows →](05_styles-editor.md)

## Before you continue — corrections
> **Applies to everyone who has followed M3 → M6/03 as written.** The colour engine those steps build produces
> themes that are, on most presets, **not readable** — and the panel badge reports them as fine. The steps
> themselves are deliberately left exactly as you executed them ([D12](../foundation/decision-log.md#d12--the-readability-repair-is-delivered-here-not-back-in-m3-m5)),
> so the whole repair is here, in one place, and it is the last thing you do before wiring the provider.
> Everything downstream in M6 — the effective colours the pickers show, the checkpoint files in
> [step 10](10_verify.md), its gate — assumes these four edits are in.

**What is wrong.** Measured across all 85 themes the engine can emit (5 combos × 13 styles × their variants),
**66 fail WCAG AA on the inactive-tab label** (as low as `1.55:1`), 15 on the sidebar, 15 on the title bar, and
35 have at least one token colour below `4.5:1`. Four separate defects, each of which looks right on the page:

1. **`paletteToTokens` clamps to `3:1`** (M5 step 02). `3:1` is WCAG 1.4.3's threshold for **large** text
   (≥18pt, or 14pt bold). Code is normal-size text, and normal-size text needs **`4.5:1`**.
2. **`paletteToChrome` never clamps at all** (M3 step 06). It assigns `palette.text` and `palette.textMuted`
   raw onto `surface` and `surfaceAlt` — backgrounds those colours were never measured against. The
   readability work the guide describes only ever covered tokens.
3. **`ensureContrast` picks its walk direction from the background's luminance** (M3 step 01). Against a
   mid-tone background that direction can be the unreachable one: lightening a dark foreground walks it
   *through* the background's own luminance and caps at white still short of the bar.
4. **The badge grades one pair** (M4 step 03) — `text` on `bg` — and reports it as the theme's contrast. That is
   why nothing above was ever noticed: the badge read a green **AA** while the sidebar sat at `2.53:1`.

### 1. `src/engine/color.ts` — `ensureContrast` tries both directions
**WHERE:** the last function in the file, `ensureContrast`. **WHY:** a single-direction walk cannot converge on
mid-tone backgrounds, and it fails *silently* — it returns a colour, just an unreadable one.

**Replace the whole `ensureContrast` function** (and its comment) with the version below. It keeps the same
signature, so nothing that calls it changes; the loop moves into a new private helper:

```ts
// Nudge `foreground` lighter OR darker until it clears `targetRatio` against `background`.
// Both directions get tried: against a mid-tone background only one of them can reach the bar,
// and which one is not something the background's luminance alone can tell you.
export function ensureContrast(foreground: string, background: string, targetRatio: number): string {
  if (contrastRatio(foreground, background) >= targetRatio) return foreground;
  const lighter = walkLightness(foreground, background, targetRatio, +0.01);
  if (contrastRatio(lighter, background) >= targetRatio) return lighter;
  const darker = walkLightness(foreground, background, targetRatio, -0.01);
  if (contrastRatio(darker, background) >= targetRatio) return darker;
  // Neither direction reaches it — hand back the better of the two extremes.
  return contrastRatio(lighter, background) >= contrastRatio(darker, background) ? lighter : darker;
}

// Step lightness by `delta` until the ratio clears, or until the axis runs out.
function walkLightness(foreground: string, background: string, targetRatio: number, delta: number): string {
  let hsl = hexToHsl(foreground);
  for (let step = 0; step < 100; step++) {
    hsl = { ...hsl, l: clamp(hsl.l + delta, 0, 1) };
    const candidate = hslToHex(hsl);
    if (contrastRatio(candidate, background) >= targetRatio) return candidate;
    if (hsl.l <= 0 || hsl.l >= 1) break;
  }
  return hslToHex(hsl);
}
```

> 🧠 **Why not "lighten on dark, darken on light".** That shortcut works at the two ends of the scale and fails
> in the middle. Take a mid-tone olive background: lightening a dark foreground makes contrast *worse* before it
> gets better, and the walk can hit pure white still short of the bar, while darkening would have cleared it in a
> few steps. Trying both costs one extra loop and always finds the reachable side. Note the new tail, too —
> `walkLightness` returns the extreme it actually reached (`hslToHex(hsl)`), not a hardcoded `#ffffff`/`#111111`,
> so the caller can compare the two candidates honestly.

### 2. `src/engine/generate.ts` — clamp every foreground, and report the weakest pair
**WHERE:** `src/engine/generate.ts`, three regions: the `./color` import, the body of `paletteToChrome`, and
`paletteToTokens`. Plus one new exported function. **WHY:** defects 1, 2 and 4 above.

1. **Widen the `./color` import** — `contrastRatio` is needed by the new readout:
   ```ts
   import { readableOn, mix, rotate, ensureContrast, contrastRatio } from './color';
   ```
2. **In `paletteToChrome`, add the `on` helper below `onAccent` and route all six text foregrounds through it.**
   Each one is clamped against the background **it actually sits on** — that is the whole fix; clamping them all
   against `palette.bg` compiles fine, looks right in the editor, and leaves every panel unreadable:
   ```ts
   function paletteToChrome(palette: Palette): ChromeColors {
     const onAccent = readableOn(palette.accent1);
     // WCAG 1.4.3: body text needs 4.5:1. Every foreground below is clamped against the
     // background it actually sits on — not against the editor background it never touches.
     const on = (foreground: string, background: string) => ensureContrast(foreground, background, 4.5);
     return {
       'editor.background': palette.bg,
       'editor.foreground': on(palette.text, palette.bg),
       'sideBar.background': palette.surface,
       'sideBar.foreground': on(palette.text, palette.surface),
       'sideBarSectionHeader.background': palette.surfaceAlt,
       'activityBar.background': palette.surfaceAlt,
       'activityBar.foreground': on(palette.accent1, palette.surfaceAlt),
       'activityBar.activeBorder': palette.accent1,
       'statusBar.background': palette.accent1,
       'statusBar.foreground': onAccent,
       'titleBar.activeBackground': palette.surfaceAlt,
       'titleBar.activeForeground': on(palette.text, palette.surfaceAlt),
       'tab.activeBackground': palette.bg,
       'tab.inactiveBackground': palette.surface,
       'tab.activeForeground': on(palette.text, palette.bg),
       'tab.inactiveForeground': on(palette.textMuted, palette.surface),
       'editorGroupHeader.tabsBackground': palette.surface,
       'panel.background': palette.surface,
       'panel.border': palette.border,
       'focusBorder': palette.accent2,
     };
   }
   ```
   The map is still **20 keys** — M6 changes the *values* in it, never its size
   ([D7](../foundation/decision-log.md#d7--m2s-demo-sets-the-status-bar-debugging-colors-the-m3-engine-map-does-not)).
   `statusBar.foreground` keeps `readableOn`, which already picks the better of near-white/near-black.
3. **Add `TEXT_PAIRS` and `worstTextContrast` directly below `paletteToChrome`.** This is the readout the badge
   will grade — the weakest of the seven pairs that paint text on a background, plus the editor's own pair
   beside it:
   ```ts
   // The chrome pairs that paint text on a background — exactly the ones `paletteToChrome` clamps.
   const TEXT_PAIRS: Array<[string, string, string]> = [
     ['editor', 'editor.foreground', 'editor.background'],
     ['sideBar', 'sideBar.foreground', 'sideBar.background'],
     ['activityBar', 'activityBar.foreground', 'activityBar.background'],
     ['statusBar', 'statusBar.foreground', 'statusBar.background'],
     ['titleBar', 'titleBar.activeForeground', 'titleBar.activeBackground'],
     ['tab.active', 'tab.activeForeground', 'tab.activeBackground'],
     ['tab.inactive', 'tab.inactiveForeground', 'tab.inactiveBackground'],
   ];

   // What the panel badge reports. `ratio` is the WEAKEST text pair in the theme — the floor the
   // whole theme is guaranteed to clear, and what the badge grades. `editor` is the editor's own
   // text-on-background pair, kept alongside it because that is the number a reader watches swing as
   // they cycle styles; the floor barely moves, since the clamp stops at exactly 4.5:1.
   export function worstTextContrast(
     chrome: ChromeColors,
   ): { pair: string; ratio: number; editor: number } {
     let worstPair = TEXT_PAIRS[0][0];
     let worstRatio = Infinity;
     for (const [label, foreground, background] of TEXT_PAIRS) {
       const ratio = contrastRatio(chrome[foreground], chrome[background]);
       if (ratio < worstRatio) { worstRatio = ratio; worstPair = label; }
     }
     const round = (value: number) => Math.round(value * 100) / 100;
     return {
       pair: worstPair,
       ratio: round(worstRatio),
       editor: round(contrastRatio(chrome['editor.foreground'], chrome['editor.background'])),
     };
   }
   ```
   > 🧠 **A gate that samples one case cannot assert the class.** The old badge said "contrast" and measured
   > *one* pair out of seven, so it could not go red on a theme whose sidebar was illegible — and because it was
   > green, nobody looked. A readout whose label names a set (*the theme*) must measure the **worst member of
   > that set** and say which member lost. That is why `worstTextContrast` returns `pair` as well as `ratio`.
4. **In `paletteToTokens`, raise the clamp from `3` to `4.5`** — one character, defect 1:
   ```ts
   const readable = (hex: string) => ensureContrast(hex, palette.bg, 4.5);
   ```

### 3. `src/panel/ThemePanelProvider.ts` — send the new readout
**WHERE:** the imports, and the `this.post({ type: 'applied', … })` call inside `case 'apply'`. **WHY:** the
badge can only grade what the extension sends it.

1. **Replace the `contrastRatio` import** — the provider no longer does contrast maths itself:
   ```ts
   import { worstTextContrast } from '../engine/generate';
   ```
   Delete the old `import { contrastRatio } from '../engine/color';` line.
2. **In `case 'apply'`, replace the `contrast` field** with the whole readout object (the engine already rounds
   both ratios):
   ```ts
   contrast: worstTextContrast(theme.chrome),
   ```

### 4. `media/webview/main.js` — the badge grades the floor and shows the editor
**WHERE:** `renderPreview(palette, contrast)`, the two lines after `box.append(strip);`. **WHY:** `contrast` is
now `{ pair, ratio, editor }`, not a number — reading it as a number would render `NaN:1`.

```js
    const aa = contrast.ratio >= 4.5, aaa = contrast.ratio >= 7;
    box.append(el('span', {
      className: 'badge ' + (aaa ? 'ok' : aa ? 'warn' : 'bad'),
      textContent: 'editor ' + contrast.editor + ':1 · floor ' + contrast.pair + ' ' + contrast.ratio + ':1 ' + (aaa ? 'AAA' : aa ? 'AA' : 'FAIL'),
    }));
```

> ⚠️ **An amber `AA` is now the expected steady state, on every theme.** `paletteToChrome` clamps the weakest
> pair to exactly `4.5:1` and no further, so **no theme in the gallery reaches AAA** — a green badge would be
> news, and a red `FAIL` means the clamp isn't running. Read the two halves differently: the **floor** is the
> guarantee (it spans `4.50`–`6.22` across all 85 themes), the **editor** number is the one that moves
> (`4.88`–`18.19`) and the one to judge a style by.

### Corrected when
Run all four. The first three are pure engine and need no <kbd>F5</kbd>; run `npm run compile` first.

1. **The chrome floor holds across every theme:**
   ```powershell
   node -e "const {generate,worstTextContrast}=require('./out/engine/generate');const {COMBOS}=require('./out/engine/combos');const {PROFILES}=require('./out/engine/profiles');let worst={ratio:Infinity},n=0;for(const c of COMBOS)for(const p of PROFILES)for(const v of (p.variants&&p.variants.length?p.variants:[undefined])){n++;const w=worstTextContrast(generate(c,p,v).chrome);if(w.ratio<worst.ratio)worst={...w,id:c.id+'/'+p.id+(v?'/'+v:'')}}console.log('themes',n);console.log('lowest',worst.ratio,worst.pair,worst.id);console.log('all AA',worst.ratio>=4.5)"
   ```
   **Expected, exactly:**
   ```
   themes 85
   lowest 4.5 activityBar deep-sea/sixteen-bit
   all AA true
   ```
2. **The token floor holds too**, and the duplicate-colour tripwire reads 17:
   ```powershell
   node -e "const {generate}=require('./out/engine/generate.js');const {contrastRatio}=require('./out/engine/color.js');const {COMBOS}=require('./out/engine/combos.js');const {PROFILES}=require('./out/engine/profiles.js');let low=99,lowId='',n=0,collapsed=0;for(const c of COMBOS)for(const p of PROFILES)for(const v of (p.variants&&p.variants.length?p.variants:[undefined])){n++;const t=generate(c,p,v),bg=t.chrome['editor.background'],toks=Object.values(t.tokens);const m=Math.min(...toks.map(x=>contrastRatio(x,bg)));if(m<low){low=m;lowId=c.id+'/'+p.id+(v?'/'+v:'')}if(new Set(toks).size<7)collapsed++}console.log('themes',n);console.log('lowest token',Math.round(low*100)/100,lowId);console.log('all AA',low>=4.5);console.log('themes with duplicate token colors',collapsed)"
   ```
   **Expected, exactly:**
   ```
   themes 85
   lowest token 4.5 deep-sea/warm-sepia
   all AA true
   themes with duplicate token colors 17
   ```
   > 🧠 **Read the last line, don't panic at it.** `all AA true` is the assertion. The **17** is *not* a failure:
   > `monochrome` and `game-boy` are deliberately limited-palette styles, so several roles landing on the same
   > colour is the style working. It's a tripwire — if that number *jumps* after you touch `paletteToTokens`, a
   > colourful profile has started collapsing (usual cause: `rotate()` handed a near-grey).
3. **The map is still 20 keys** — the clamp changed values, not the shape:
   ```powershell
   node -e "const {generate}=require('./out/engine/generate.js');const {comboById}=require('./out/engine/combos.js');const {profileById}=require('./out/engine/profiles.js');console.log('chrome keys:',Object.keys(generate(comboById('deep-sea'),profileById('neon')).chrome).length)"
   ```
   → prints `chrome keys: 20`.
4. **Under <kbd>F5</kbd>**, click through several style chips: the badge reads
   `editor <n>:1 · floor <pair> <n>:1 AA` — two numbers and a pair name, never `NaN`, never `undefined` — and
   the sidebar, title bar and inactive tab labels are legible on every one of them.

## If a correction breaks
- **`walkLightness is not defined`** → it went in as a `const` arrow *below* `ensureContrast`. Function
  declarations hoist, `const` doesn't. Paste it exactly as written (a `function` declaration) or move it above.
- **`worstTextContrast` is not exported / not found** → it must carry `export` and live in `generate.ts`, not
  `color.ts`; the provider imports it from `'../engine/generate'`.
- **The badge shows `NaN:1`** → edit 4 was skipped, or only half of it: the webview is still reading `contrast`
  as a number while the extension now sends an object.
- **`all AA false` and the failing pair sits on a mid-tone background** → edit 1 didn't land. That is exactly
  the case a single-direction walk cannot solve.
- **The editor text is fine but a panel is still unreadable** → a foreground is being clamped against the wrong
  background in edit 2. Each `on(...)` takes the background that key actually sits on: `sideBar.foreground` on
  `palette.surface`, `titleBar.activeForeground` on `palette.surfaceAlt`, `tab.inactiveForeground` on
  `palette.surface`.
- **A token colour comes out near-white or near-black** → that's the floor doing its job on a very light/dark
  `bg`, not a bug. Change the profile/combo if you want a different look.

## Glossary for this step
- **[Effective color](../foundation/glossary.md#effective-color)** — the color a role *ended up* with after the
  formula ran and any override was layered on. It's what the editor is actually painted with, and therefore what a
  role's swatch must display. *(Introduced here.)*

## Why / design
The engine can now take overrides (step 03) and the panel will produce them (step 06). The provider is the wire
between them, and it carries traffic in **both** directions:

- **Webview → extension.** The `apply` message gains one field, `overrides`, forwarded verbatim as `generate()`'s
  4th argument. The provider does **not** validate it — `isHex` already does, inside the merge, on every single
  value. One gate, in the pure layer, is the whole point of step 02.
- **Extension → webview.** The `applied` message must now carry **`tokens` and `semantic`** alongside the
  `palette` it already sent. This is the half that's easy to miss, so here is why it's mandatory:

> 🧠 **New concept — the picker needs the *effective* color, and only the extension knows it.** A role's swatch
> has to show the color that role currently *is*. For a pinned role that's your own hex, which the webview
> obviously knows. For the other 25 it's a value the formula computed — `#3ec6ff` rotated by −20° and clamped to
> 4.5:1 against the background — and the webview has no engine, no combos and no profiles. It literally cannot
> compute it. So the extension sends all three finished maps back after every apply, and the webview's rule for
> what to display becomes a single line it can execute with no color knowledge at all:
>
> ```
> shown = my override for this role  ??  the effective color the extension just sent
> ```
>
> This is the same *data-driven rendering* contract M4 set up for the profile list (the webview draws whatever
> `init` carries and hardcodes nothing) — extended from "which styles exist" to "what color is each role right now".

Everything else in this file stays exactly as M5 left it. In particular `applyTheme`, `ThemeHistory` and
`src/theme/*` are **not touched in this milestone at all**: an override changes the *values* inside a
`ThemeResult`, never its shape, so the one write path and the snapshot backbone can't tell the difference. That is
the payoff of merging inside `generate()` rather than at the settings boundary.

## Do this
This step edits **one file**: `src/panel/ThemePanelProvider.ts` — the M5 version. You change **three regions**: the
types import, the `last` field, and the body of `case 'apply'`. Every other case (`ready`, `revert`, `reset`,
`save`, `applySet`, `delete`, `export`, `import`), the constructor, `resolveWebviewView`, `getHtml` and `getNonce`
are untouched here — `save` and `applySet` get their own edits in step 09. (The complete file is in
[the M6 checkpoint](10_verify.md) under `### src/panel/ThemePanelProvider.ts`.)

> **Before you start:** step 03 must compile — this step calls `generate()` with a 4th argument, which is a type
> error until `generate` accepts one. `src/panel/ThemePanelProvider.ts` must be at its M5 state (it already
> imports `generate`, `worstTextContrast` and the storage helpers).

1. Open `src/panel/ThemePanelProvider.ts`.
2. **Add one import.** The provider needs the `ThemeOverrides` type to remember the last selection. Add this line
   **directly below the existing `import { generate } from '../engine/generate';` line**:
   ```ts
   import { ThemeOverrides } from '../engine/types';
   ```
3. **Widen the `last` field** so a re-generate (step 09's **Save**) reproduces the theme you're actually
   looking at, overrides included. Replace the `private last?: …` line with:
   ```ts
   private last?: { comboId: string; profileId: string; variant?: string; overrides?: ThemeOverrides };
   ```
4. **Rewrite the body of `case 'apply'`.** Two edits inside it: remember and forward `m.overrides`, and send the
   token + semantic maps back. Replace the whole `case 'apply': { … }` block with:
   ```ts
   case 'apply': {
     this.last = { comboId: m.comboId, profileId: m.profileId, variant: m.variant, overrides: m.overrides };
     const theme = generate(comboById(m.comboId), profileById(m.profileId), m.variant, m.overrides);
     await this.history.apply(() => applyTheme(theme, m.languageId || undefined));
     this.post({
       type: 'applied',
       palette: theme.palette,
       tokens: theme.tokens,        // NEW — the 7 effective syntax-token colors
       semantic: theme.semantic,    // NEW — the 13 effective semantic-type colors
       contrast: worstTextContrast(theme.chrome),
     });
     break;
   }
   ```
   `m.overrides` is `undefined` for any message that doesn't carry the field — an M5-era webview, or the
   `apply()` you're about to write before the editor exists — and `generate()` handles `undefined` as "no
   overrides" (step 03). So this compiles and behaves *identically to M5* until step 06 starts sending a value.
5. **Do not touch the `history.apply(...)` wrapper.** It still takes one snapshot per `apply` message. Step 08
   depends on that being exactly as true for a color edit as it is for a preset pick.
6. Save and run `npm run compile`.

**Load-bearing:** the field name `overrides` on the incoming message and the field names `tokens` / `semantic` on
the outgoing `applied` message — the webview reads all three by name in steps 06–07, and a mismatch is silent (a
webview message with an unknown field is simply ignored, no error anywhere). The `// NEW` comments are cosmetic.

## Done when (this step)
- `npm run compile` is clean.
- Press <kbd>F5</kbd> and use the panel as you did in M5: picking a combo or a style still recolors chrome and
  code, Revert/Reset still work, saved sets still apply. **Nothing looks different** — that's the pass condition.
  This step is a widening, not a feature: the extra `tokens`/`semantic` fields are arriving in the webview and
  being ignored, because nothing reads them until step 06.
- Optional proof the new fields really are on the wire, without any UI: in the Extension Development Host open
  Command Palette → **Developer: Open Webview Developer Tools** (the *webview's* console — **not** Help → Toggle
  Developer Tools, which opens the extension host's and won't see these messages), then in the panel pick any style. The webview's
  `window.addEventListener('message', …)` from M5 already receives the object; type
  `window.addEventListener('message', e => console.log(e.data))` into that console *before* picking, and the logged
  `applied` message shows `palette`, `tokens`, `semantic` and `contrast`.

## If it breaks
- **`Expected 3 arguments, but got 4`** on `generate(...)` → step 03 isn't saved/compiled; `generate` still has the
  M5 signature.
- **`Property 'overrides' does not exist on type …`** on `this.last = …` → point 3's widened field type wasn't
  applied, or you widened a different declaration. It's the one `private last?:` line in the class.
- **Colors stopped applying entirely after this edit** → the rewritten `case 'apply'` lost its `break;` and fell
  through into `case 'revert'`. Every case in this switch ends with `break` (or a `return` inside a guard).
- **`Cannot find module '../engine/types'`** → the provider lives in `src/panel/`, so the engine is one level up:
  `../engine/types`, matching the `../engine/generate` import right above it.

---
> Nav: [← Thread them through `generate()`](03_generate-overrides.md) · [Overview](00_overview.md) · [Style the role rows →](05_styles-editor.md)
