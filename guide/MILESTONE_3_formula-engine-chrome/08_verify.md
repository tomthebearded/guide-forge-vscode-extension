# M3 · Step 08 of 8 — Verify the milestone + file checkpoint
> Nav: [← Panel: two dropdowns](07_panel-selects.md) · [Overview](00_overview.md) · [M4 → Preset gallery + panel UX](../MILESTONE_4_gallery-and-ux/00_overview.md)

## Done-when gate (run every check)
Do these in order; each pairs an action with the **exact** result you should see. The first is pure Node (no F5);
the rest run in the Extension Development Host.

1. **Engine math (Node, no F5)** — compile, then run a one-liner against the compiled engine:
   ```powershell
   npx tsc -p ./
   node -e "const color=require('./out/engine/color'); console.log('round-trip', color.hslToHex(color.hexToHsl('#3ec6ff'))); console.log('contrast', color.contrastRatio('#ffffff','#000000'))"
   ```
   **Expected — exactly:**
   ```
   round-trip #3ec6ff
   contrast 21
   ```
   (Round-trip is lossless; black-on-white contrast is the maximum `21`.)

   Then the **readability floor** — the one check that proves the clamping in `paletteToChrome` actually holds,
   across every theme the engine can produce, without opening VS Code once:
   ```powershell
   node -e "const {generate,worstTextContrast}=require('./out/engine/generate');const {COMBOS}=require('./out/engine/combos');const {PROFILES}=require('./out/engine/profiles');let worst={ratio:Infinity},n=0;for(const c of COMBOS)for(const p of PROFILES)for(const v of (p.variants&&p.variants.length?p.variants:[undefined])){n++;const w=worstTextContrast(generate(c,p,v).chrome);if(w.ratio<worst.ratio)worst={...w,id:c.id+'/'+p.id+(v?'/'+v:'')}}console.log('themes',n);console.log('lowest',worst.ratio,worst.pair,worst.id);console.log('all AA',worst.ratio>=4.5)"
   ```
   **Expected — exactly:**
   ```
   themes 50
   lowest 4.5 tab.inactive ember/warm-sepia
   all AA true
   ```
   > 🧠 **New concept — clamp against the background a color actually sits on.** A theme is not readable because
   > its *editor* text passes; it is readable when **every** foreground clears 4.5:1 against **its own**
   > background. `sideBar.foreground` sits on `sideBar.background`, not on `editor.background` — checking it
   > against the wrong one is how a sidebar ends up at 2.5:1 while the badge says AA. `paletteToChrome` therefore
   > clamps each foreground against its real partner, and `worstTextContrast` reports the weakest of the seven
   > pairs so nothing can hide behind an average. `all AA true` is the assertion; the `lowest` line tells you
   > which pair is closest to the edge. **The number after `themes` is 50 at M3 (5 combos × the 9 generative
   > profiles, counting each profile's variants separately) and becomes 85 once M4 adds the 4 signature presets —
   > M4's gate re-runs it with the new total.**

2. **Engine wiring (Node, no F5)** — prove `generate` produces a full chrome object:
   ```powershell
   node -e "const {generate}=require('./out/engine/generate'); const {comboById}=require('./out/engine/combos'); const {profileById}=require('./out/engine/profiles'); const theme=generate(comboById('deep-sea'),profileById('midnight')); console.log('keys', Object.keys(theme.chrome).length); console.log('bg', theme.chrome['editor.background'])"
   ```
   **Expected — exactly:**
   ```
   keys 20
   bg #000000
   ```
   (20 workbench keys; Midnight forces `editor.background` to pure black.)

3. **Panel dropdowns** — press <kbd>F5</kbd>, open the Van Code panel. It shows a **Starter** dropdown with 5
   options (Deep Sea, Ember, Grove, Orchid, Graphite) and a **Style** dropdown with 9 options (Neon … Monochrome +
   Accent), above **Apply / Revert / Reset**.

4. **Live chrome apply** — pick **Deep Sea** + **Neon** (or click **Apply**). The whole editor *chrome* recolors at
   once and live (no reload): editor background deep navy, sidebar/activity bar dark, tabs and panels coordinated,
   title bar tinted.
   **The status bar is the one exception: it stays debug-orange.** That is correct under <kbd>F5</kbd> — the EDH is
   being debugged, so `statusBar.debugging*` (which the 20-key map deliberately omits) wins over the
   `statusBar.background` we do write. Check 5 proves the value landed; see [step 06](06_generate.md) for why.

5. **Settings diff** — open your User `settings.json` (Command Palette → **Preferences: Open User Settings (JSON)**).
   `workbench.colorCustomizations` is now present with **20 keys**, e.g.:
   ```jsonc
   "workbench.colorCustomizations": {
     "editor.background": "#08151f",
     "statusBar.background": "#5cd0ff",
     "statusBar.foreground": "#111111",
     "activityBar.activeBorder": "#5cd0ff"
     // …20 keys total
   }
   ```
   (Exact hexes depend on the profile's math; the **key count** and **coherence** are what matter.)

6. **Switch re-applies live** — change the **Style** dropdown to **Midnight / OLED**. The editor background snaps to
   pure black (`#000000`) immediately, without touching Apply.

7. **Revert restores** — click **Revert**. The previous palette (Neon) returns exactly — verify against the
   settings.json diff: `editor.background` goes back to the Neon value. Click **Revert** again → back to whatever was
   there before M3. Click **Reset** → `workbench.colorCustomizations` is **removed** from settings entirely (the M2
   backbone is intact).

If all seven pass, **M3 is done**: a starter combo + a generative profile produces a full, coordinated, live,
revertible chrome theme — through a pure engine you verified in plain Node. Tokens, the gallery, swatches, and the
contrast readout are still ahead.

## Files after this milestone (complete current contents)
Files **created this milestone**: the five `src/engine/*` files. File **modified this milestone**:
`src/panel/ThemePanelProvider.ts`. `src/extension.ts`, `src/theme/*`, `package.json`, and `media/icon.svg` are
**unchanged from M2**.

### `src/engine/color.ts`
```ts
// Pure color math. No VS Code imports. Colors cross the boundary as "#rrggbb" strings.

export interface Rgb { r: number; g: number; b: number; } // 0..255
export interface Hsl { h: number; s: number; l: number; }  // h 0..360, s/l 0..1

/** Force `value` into the range [min, max]. */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function hexToRgb(hex: string): Rgb {
  const digits = hex.replace('#', '');
  // Shorthand "#f80" means "#ff8800" — each digit stands for the pair "dd".
  const sixDigits = digits.length === 3 ? digits.split('').map((digit) => digit + digit).join('') : digits;
  return {
    r: parseInt(sixDigits.slice(0, 2), 16),
    g: parseInt(sixDigits.slice(2, 4), 16),
    b: parseInt(sixDigits.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  // Channels arrive as floats (the math produces 254.7, -0.3…), so round + clamp before writing.
  const toHexPair = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
  return `#${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`;
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  // Work in 0..1 so the channels line up with saturation/lightness.
  const red = r / 255, green = g / 255, blue = b / 255;
  const brightest = Math.max(red, green, blue), darkest = Math.min(red, green, blue);
  const lightness = (brightest + darkest) / 2;
  // Chroma = how far apart the extremes are. Grey means all three are equal, so chroma 0 = no hue.
  const chroma = brightest - darkest;
  let hue = 0, saturation = 0;
  if (chroma !== 0) {
    // Saturation is chroma as a fraction of the most chroma possible at *this* lightness —
    // that ceiling shrinks toward pure black and pure white.
    const maxChromaAtThisLightness = lightness > 0.5 ? 2 - brightest - darkest : brightest + darkest;
    saturation = chroma / maxChromaAtThisLightness;
    // Whichever channel won says which pair of 60° slices we're in; the other two give the
    // position inside it, in slice units (0..6).
    switch (brightest) {
      case red:   hue = ((green - blue) / chroma + (green < blue ? 6 : 0)); break;
      case green: hue = ((blue - red) / chroma + 2); break;
      default:    hue = ((red - green) / chroma + 4); break;   // blue won
    }
    hue *= 60;   // slices -> degrees
  }
  return { h: hue, s: saturation, l: lightness };
}

export function hslToHex({ h, s, l }: Hsl): string {
  // Hue is an angle, so it wraps (400° -> 40°); the double modulo fixes JS's signed `%`.
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  // Same ceiling as in hexToHsl, solved for chroma instead of saturation.
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  // Every hue has one channel at full chroma, one at 0, and one ramping between — the secondary.
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  // The triple below is centred on lightness 0.5; this slides it to the requested lightness.
  const lightnessOffset = lightness - chroma / 2;
  let red = 0, green = 0, blue = 0;
  switch (Math.floor(hue / 60)) {
    case 0:  red = chroma;    green = secondary; break;   //   0–60°  red -> yellow
    case 1:  red = secondary; green = chroma;    break;   //  60–120° yellow -> green
    case 2:  green = chroma;    blue = secondary; break;  // 120–180° green -> cyan
    case 3:  green = secondary; blue = chroma;    break;  // 180–240° cyan -> blue
    case 4:  red = secondary;   blue = chroma;    break;  // 240–300° blue -> magenta
    default: red = chroma;      blue = secondary; break;  // 300–360° magenta -> red
  }
  return rgbToHex({
    r: (red + lightnessOffset) * 255,
    g: (green + lightnessOffset) * 255,
    b: (blue + lightnessOffset) * 255,
  });
}

// The dial operations: go to HSL, move exactly one dial, come back.
export function lighten(hex: string, amount: number): string {
  const hsl = hexToHsl(hex); return hslToHex({ ...hsl, l: hsl.l + amount });
}
export function darken(hex: string, amount: number): string {
  const hsl = hexToHsl(hex); return hslToHex({ ...hsl, l: hsl.l - amount });
}
export function saturate(hex: string, amount: number): string {
  const hsl = hexToHsl(hex); return hslToHex({ ...hsl, s: hsl.s + amount });
}
export function desaturate(hex: string, amount: number): string {
  const hsl = hexToHsl(hex); return hslToHex({ ...hsl, s: hsl.s - amount });
}
// [M5] Unused until M5 derives token colors by nudging an accent off its current hue.
export function rotate(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex); return hslToHex({ ...hsl, h: hsl.h + degrees });
}
export function setHue(hex: string, hue: number): string {
  const hsl = hexToHsl(hex); return hslToHex({ ...hsl, h: hue });
}
/** `amount` 0 returns `fromHex`, 1 returns `toHex`, 0.5 the halfway point. */
export function mix(fromHex: string, toHex: string, amount: number): string {
  const from = hexToRgb(fromHex), to = hexToRgb(toHex);
  return rgbToHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
}

// WCAG relative luminance + contrast ratio.
function channelLuminance(channel: number): number {
  // Undo the sRGB gamma curve so the channel is proportional to physical light.
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}
export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA), luminanceB = relativeLuminance(hexB);
  const brighter = Math.max(luminanceA, luminanceB), darker = Math.min(luminanceA, luminanceB);
  return (brighter + 0.05) / (darker + 0.05);
}

// Return near-black or near-white, whichever reads better on `background`.
export function readableOn(background: string): string {
  return contrastRatio('#ffffff', background) >= contrastRatio('#111111', background) ? '#ffffff' : '#111111';
}

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

### `src/engine/types.ts`  *(M3 version — chrome only)*
```ts
// [M3 version] — chrome only. [M5] appends TokenColors, SemanticColors, and tokens/semantic on ThemeResult.
export type Hex = string;

export interface StarterCombo {
  id: string;
  label: string;
  bg: Hex;
  surface: Hex;
  text: Hex;
  accent1: Hex;
  accent2: Hex;
}

// 8 coordinated roles every profile produces.
export interface Palette {
  bg: Hex;
  surface: Hex;
  surfaceAlt: Hex;
  text: Hex;
  textMuted: Hex;
  accent1: Hex;
  accent2: Hex;
  border: Hex;
}

export type ChromeColors = Record<string, Hex>;

export interface ThemeResult {
  palette: Palette;
  chrome: ChromeColors;
  // [M5] adds: tokens: TokenColors; semantic: SemanticColors;
}

export interface StyleProfile {
  id: string;
  label: string;
  family: 'generative' | 'signature';
  variants?: string[];                       // e.g. Nature: ['ocean','forest']
  buildPalette(combo: StarterCombo, variant?: string): Palette;
}
```

### `src/engine/combos.ts`
```ts
import { StarterCombo } from './types';

export const COMBOS: StarterCombo[] = [
  { id: 'deep-sea', label: 'Deep Sea', bg: '#0b1a2b', surface: '#13293d', text: '#dbe9f4', accent1: '#3ec6ff', accent2: '#5eead4' },
  { id: 'ember',    label: 'Ember',    bg: '#1b1210', surface: '#2a1a15', text: '#f6e7dd', accent1: '#ff7849', accent2: '#ffd24c' },
  { id: 'grove',    label: 'Grove',    bg: '#0f1f17', surface: '#183025', text: '#e4f2ea', accent1: '#5fd68b', accent2: '#b8d96a' },
  { id: 'orchid',   label: 'Orchid',   bg: '#170f22', surface: '#241634', text: '#efe6f7', accent1: '#c084fc', accent2: '#ff77c8' },
  { id: 'graphite', label: 'Graphite', bg: '#17191c', surface: '#212429', text: '#e6e8ea', accent1: '#7dd3fc', accent2: '#9aa0a6' },
];

export function comboById(id: string): StarterCombo {
  return COMBOS.find((combo) => combo.id === id) ?? COMBOS[0];
}
```

### `src/engine/profiles.ts`  *(9 generative profiles)*
```ts
// [M3] exports GENERATIVE (9 profiles) + PROFILES = [...GENERATIVE]. [M4] appends SIGNATURE.
import { Palette, StarterCombo, StyleProfile } from './types';
import { darken, lighten, saturate, desaturate, setHue, mix, ensureContrast } from './color';

// Shared base: map a combo's 5 colors to the 8 palette roles.
function base(combo: StarterCombo): Palette {
  return {
    bg: combo.bg,
    surface: combo.surface,
    surfaceAlt: lighten(combo.surface, 0.04),
    text: combo.text,
    textMuted: mix(combo.text, combo.surface, 0.5),
    accent1: combo.accent1,
    accent2: combo.accent2,
    border: mix(combo.surface, combo.text, 0.15),
  };
}

export const GENERATIVE: StyleProfile[] = [
  {
    id: 'neon', label: 'Neon', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      return { ...palette,
        bg: darken(palette.bg, 0.03), surface: darken(palette.surface, 0.02),
        accent1: saturate(lighten(palette.accent1, 0.05), 0.3),
        accent2: saturate(lighten(palette.accent2, 0.05), 0.3),
        text: lighten(palette.text, 0.02) };
    },
  },
  {
    id: 'pastel', label: 'Pastel', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      return { ...palette,
        surface: lighten(palette.surface, 0.06), surfaceAlt: lighten(palette.surfaceAlt, 0.06),
        accent1: lighten(desaturate(palette.accent1, 0.25), 0.12),
        accent2: lighten(desaturate(palette.accent2, 0.25), 0.12) };
    },
  },
  {
    id: 'midnight', label: 'Midnight / OLED', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      return { ...palette, bg: '#000000', surface: darken(palette.surface, 0.06), surfaceAlt: darken(palette.surfaceAlt, 0.05) };
    },
  },
  {
    id: 'warm-sepia', label: 'Warm Sepia', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      const warm = (hex: string, amount: number) => mix(hex, '#c98a3c', amount);
      return { ...palette,
        bg: warm(palette.bg, 0.10), surface: warm(palette.surface, 0.12), surfaceAlt: warm(palette.surfaceAlt, 0.12),
        text: warm(palette.text, 0.06), textMuted: warm(palette.textMuted, 0.10),
        accent1: setHue(palette.accent1, 32), accent2: setHue(palette.accent2, 44) };
    },
  },
  {
    id: 'material', label: 'Material', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      return { ...palette,
        bg: '#121212', surface: '#1e1e1e', surfaceAlt: '#242424',
        text: '#e0e0e0', textMuted: '#9e9e9e',
        accent1: saturate(palette.accent1, 0.05), accent2: saturate(palette.accent2, 0.05),
        border: '#2c2c2c' };
    },
  },
  {
    id: 'nature', label: 'Nature', family: 'generative', variants: ['ocean', 'forest'],
    buildPalette: (combo, variant = 'ocean') => {
      const palette = base(combo);
      const hue = variant === 'forest' ? 140 : 200;
      return { ...palette,
        bg: mix(palette.bg, setHue(palette.bg, hue), 0.5),
        surface: mix(palette.surface, setHue(palette.surface, hue), 0.5),
        accent1: setHue(palette.accent1, hue),
        accent2: setHue(palette.accent2, hue + (variant === 'forest' ? 40 : -30)) };
    },
  },
  {
    id: 'high-contrast', label: 'High Contrast (AAA)', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      const bg = darken(palette.bg, 0.02);
      return { ...palette, bg,
        text: ensureContrast(palette.text, bg, 7),
        textMuted: ensureContrast(palette.textMuted, bg, 4.5),
        accent1: ensureContrast(saturate(palette.accent1, 0.1), bg, 7),
        accent2: ensureContrast(saturate(palette.accent2, 0.1), bg, 7),
        border: ensureContrast(palette.border, bg, 3) };
    },
  },
  {
    id: 'muted', label: 'Muted / Low-strain', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      return { ...palette,
        text: desaturate(darken(palette.text, 0.05), 0.1),
        accent1: desaturate(darken(palette.accent1, 0.05), 0.25),
        accent2: desaturate(darken(palette.accent2, 0.05), 0.25) };
    },
  },
  {
    id: 'monochrome', label: 'Monochrome + Accent', family: 'generative',
    buildPalette: (combo) => {
      const palette = base(combo);
      const gray = (hex: string) => desaturate(hex, 1);
      return {
        bg: gray(palette.bg), surface: gray(palette.surface), surfaceAlt: gray(palette.surfaceAlt),
        text: gray(palette.text), textMuted: gray(palette.textMuted), border: gray(palette.border),
        accent1: palette.accent1, accent2: palette.accent1 };
    },
  },
];

// [M3] PROFILES = [...GENERATIVE]. [M4] becomes [...GENERATIVE, ...SIGNATURE].
export const PROFILES: StyleProfile[] = [...GENERATIVE];

export function profileById(id: string): StyleProfile {
  return PROFILES.find((profile) => profile.id === id) ?? PROFILES[0];
}
```

### `src/engine/generate.ts`  *(M3 version — `{ palette, chrome }`)*
```ts
// [M3 version] returns { palette, chrome } only. [M5] adds tokens + semantic.
import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult } from './types';
import { readableOn, ensureContrast, contrastRatio } from './color';

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

// [M4] What the panel badge reports. `ratio` is the WEAKEST text pair in the theme — the floor the
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

export function generate(combo: StarterCombo, profile: StyleProfile, variant?: string): ThemeResult {
  const palette = profile.buildPalette(combo, variant);
  return {
    palette,
    chrome: paletteToChrome(palette),
  };
}
```

### `src/panel/ThemePanelProvider.ts`  *(END OF M3)*
```ts
import * as vscode from 'vscode';
import { ThemeHistory } from '../theme/history';
import { applyChrome } from '../theme/apply';
import { COMBOS, comboById } from '../engine/combos';
import { GENERATIVE, profileById } from '../engine/profiles';
import { generate } from '../engine/generate';

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

  private async onMessage(m: { type: string; comboId?: string; profileId?: string }): Promise<void> {
    switch (m.type) {
      case 'apply': {
        const theme = generate(comboById(m.comboId ?? ''), profileById(m.profileId ?? ''));
        await this.history.apply(() => applyChrome(theme.chrome));
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

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const comboOpts = COMBOS.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
    const profOpts = GENERATIVE.map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
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
  <p><label>Starter <select id="combo">${comboOpts}</select></label></p>
  <p><label>Style <select id="profile">${profOpts}</select></label></p>
  <button id="apply">Apply</button>
  <button id="revert">Revert</button>
  <button id="reset">Reset</button>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const combo = document.getElementById('combo');
    const profile = document.getElementById('profile');
    function apply() { vscode.postMessage({ type: 'apply', comboId: combo.value, profileId: profile.value }); }
    document.getElementById('apply').addEventListener('click', apply);
    combo.addEventListener('change', apply);
    profile.addEventListener('change', apply);
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

## Troubleshooting sheet (M3 traps)
| Symptom | Usual cause | Fix |
|---------|-------------|-----|
| `node -e` can't find `./out/engine/color` | project not compiled, or wrong path | Run `npx tsc -p ./`; the output mirrors `src/` under `out/` |
| `Cannot use import statement outside a module` | you ran the `.ts`, not the compiled `.js` | Node runs `out/engine/*.js`; compile first |
| `contrast` prints something other than `21` | typo in `contrastRatio`/luminance weights | Weights `0.2126/0.7152/0.0722`; ratio `(brighter+0.05)/(darker+0.05)` |
| Dropdowns empty in the panel | `COMBOS`/`GENERATIVE` not imported, or option map missing | Confirm imports + `${comboOpts}`/`${profOpts}` inside the `<select>`s |
| Only the status bar changes | you left M2's `applyDemo` handler | Replace with the `apply` case that applies `theme.chrome` |
| Everything recolors **except** the status bar (stays orange) | Not a bug — the EDH is being debugged and `statusBar.debugging*` wins; the 20-key map omits it | Confirm `statusBar.background` in the `settings.json` diff (check 5); to theme it under F5 too, add the two `debugging*` keys to `paletteToChrome` (→ 22 keys, and every "20" in these gates moves) |
| Colors apply but Revert does nothing | `applyChrome` called outside `history.apply` | Wrap it: `this.history.apply(() => applyChrome(theme.chrome))` |
| `ThemePanelProvider` argument-count error | `extension.ts` drifted from M2 | Ctor is `(history)`; `extension.ts` calls `new ThemePanelProvider(history)` |
| Engine won't compile: "Cannot find module 'vscode'" in `engine/` | you imported `vscode` into the pure engine | Remove it — the engine is `vscode`-free by design |

## Next
These seven hands-on checks are the same gate as the **six** aggregated Done-when conditions in
[00_overview.md](00_overview.md) — the walkthrough splits some of them into finer steps, so the counts aren't 1:1.

Once all seven gate checks pass, continue to **[M4 — Preset gallery + panel UX](../MILESTONE_4_gallery-and-ux/00_overview.md)**:
the two dropdowns become the full chip gallery (5 combos × 9 generative **+ 4 signature presets**), with a live
palette **swatch preview** and a **WCAG contrast readout**, and the webview moves out to `media/webview/`. M4 is the
*reality-check gate* — where you stop and actually use it.

---
> Nav: [← Panel: two dropdowns](07_panel-selects.md) · [Overview](00_overview.md) · [M4 → Preset gallery + panel UX](../MILESTONE_4_gallery-and-ux/00_overview.md)
