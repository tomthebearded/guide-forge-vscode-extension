# M3 · Step 01 of 8 — Color utilities: hex, HSL, and WCAG contrast
> Nav: — · [Overview](00_overview.md) · [Types →](02_types.md)

## Glossary for this step
- **RGB** — a color as three channels, **R**ed / **G**reen / **B**lue, each `0–255`. Hex `#rrggbb` is just those three bytes written in base-16 (`ff` = 255). *(defined inline below)*
- **[HSL](../foundation/glossary.md#hsl)** — a color as **H**ue (`0–360°`, the position on the color wheel), **S**aturation (`0–1`, grey→vivid), **L**ightness (`0–1`, black→white).
- **[Contrast ratio (WCAG)](../foundation/glossary.md#contrast-ratio-wcag)** — a number from `1:1` (identical) to `21:1` (black vs. white) describing how distinguishable two colors are; text wants **≥ 4.5:1** (AA) or **≥ 7:1** (AAA).
- **Chroma** — the gap between a color's strongest and weakest RGB channel: `0` means all three are equal (a grey, with no hue at all), larger means more color present. It's the raw quantity the conversions below compute *saturation* from. *(defined inline in the code)*

## Why / design
This is the first file of the **pure engine** (`src/engine/`) — plain TypeScript with **no `import * as vscode`**.
Because it never touches the editor API, you can compile it and run it in plain Node, which is exactly what we do at
the end of this step to *prove the math* without pressing <kbd>F5</kbd>. Every profile in this milestone is built out
of the handful of functions below, so it pays to get them right and verified now.

The engine follows one rule from [conventions.md](../foundation/conventions.md#data-vs-code): **colors are strings
in, strings out** — hex `#rrggbb` at every boundary. HSL exists *only* inside this file's math. The reason we
convert to HSL at all: deriving a coordinated palette (lighten a surface, rotate a hue, mute an accent) is trivial
in HSL and painful in RGB.

> 🧠 **Color model — hex ⇆ RGB ⇆ HSL.** Three ways to name the same color:
> - **Hex / RGB** — `#3ec6ff` is R=`3e`(62), G=`c6`(198), B=`ff`(255). Good for storage and for what VS Code
>   settings expect, bad for *adjusting* a color.
> - **HSL** — the same color as `H≈198°, S=1.0, L≈0.62`. Now "make it lighter" is just *raise L*, "make it a green
>   instead" is *set H to 140*, "mute it" is *lower S* — each is one independent knob.
>
> So the pattern for every adjuster below is: **hex → HSL → nudge one channel → back to hex.** Reference:
> [MDN — `hsl()` color](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl) ·
> [MDN — color values](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).

> 🧠 **WCAG contrast — luminance, then a ratio.** Readability isn't "how different do two colors look" — it's a
> defined formula. First compute each color's **relative luminance** (perceived brightness: green counts far more
> than blue, and each channel is *gamma-corrected* — adjusted for how our eyes actually perceive brightness rather
> than the raw stored value). Then the **contrast ratio** is `(Llighter + 0.05) / (Ldarker +
> 0.05)`, giving `1:1` for identical colors up to `21:1` for pure black on pure white. We use it two ways: pick
> black-or-white text for a background (`readableOn`), and nudge a color until it's legible (`ensureContrast`).
> Reference: [W3C — relative luminance](https://www.w3.org/TR/WCAG21/#dfn-relative-luminance) ·
> [W3C — contrast (minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html).

## Do this
**Before you start:** [M2](../MILESTONE_2_nondestructive-backbone/00_overview.md) is green and the `van-code` project compiles. The Node color check at the end of this step reuses the Node 24 + `tsc` you set up in [M1/01](../MILESTONE_1_scaffold-sidebar/01_prerequisites.md) — no new install needed.

This step creates **one file**: `src/engine/color.ts`.

1. In the Explorer, create a folder **`src/engine`** (this is the pure engine layer — nothing here may import
   `vscode`), then a file **`src/engine/color.ts`**.
2. Paste the code in the **Code** block below. What each group does and why:
   - **`hexToRgb` / `rgbToHex`** — parse `#rrggbb` (or shorthand `#rgb`) into `{r,g,b}` and back. `rgbToHex` rounds
     and `clamp`s each channel to `0–255` and `padStart`s to two hex digits, so a value like `255.4` or `-2` can
     never produce a malformed color string. *(Load-bearing: these are the string↔number boundary.)*
   - **`hexToHsl` / `hslToHex`** — the two model converters. `hexToHsl` also handles the grey case (`chroma === 0` →
     saturation 0). `hslToHex` normalizes hue into `0–360` (`((h % 360) + 360) % 360`) and clamps `s`/`l`, so a
     rotate past 360° or a lighten past 1.0 wraps/clamps safely instead of breaking.
   - **`lighten` / `darken`** — move **L** up/down by an amount (e.g. `0.05` = 5 percentage points). *Why:* coordinated
     shades of one surface.
   - **`saturate` / `desaturate`** — move **S**. *Why:* Neon boosts it, Pastel/Muted cut it.
   - **`rotate` / `setHue`** — `rotate` adds degrees to **H** (relative); `setHue` sets it absolutely. *Why:* Nature
     re-hues a palette toward ocean/forest; Warm-Sepia pins accents to warm hues.
   - **`mix`** — linearly blend two colors in RGB by `amount` (`0` = all `fromHex`, `1` = all `toHex`). *Why:*
     deriving `textMuted` (text mixed toward surface) and `border` (surface mixed toward text).
   - **`relativeLuminance` / `contrastRatio`** — the WCAG math from the callout above.
   - **`readableOn`** — returns near-white or near-black, whichever has more contrast on a given background. *Why:*
     status-bar text that stays legible whatever the accent color is.
   - **`ensureContrast`** — nudges a foreground's lightness step by step until it clears a target ratio (or clamps at
     pure white/black). *Why:* the High-Contrast profile (step 05) leans on it to hit AAA.
3. Save the file. With the `watch` task running (or `npm run compile`) it should compile with **no** errors.

## Code
`src/engine/color.ts` *(the complete file — load-bearing; this is the final version, used unchanged through M5)*
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

// Nudge `foreground` lighter/darker until it clears `targetRatio` against `background` (or clamps).
export function ensureContrast(foreground: string, background: string, targetRatio: number): string {
  if (contrastRatio(foreground, background) >= targetRatio) return foreground;
  const goLighter = relativeLuminance(background) < 0.5;
  let hsl = hexToHsl(foreground);
  for (let step = 0; step < 100; step++) {
    hsl = { ...hsl, l: clamp(hsl.l + (goLighter ? 0.01 : -0.01), 0, 1) };
    const candidate = hslToHex(hsl);
    if (contrastRatio(candidate, background) >= targetRatio) return candidate;
    if (hsl.l <= 0 || hsl.l >= 1) break;
  }
  return goLighter ? '#ffffff' : '#111111';
}
```

## Do this — run the color check in Node
Because the engine is pure, you can execute it directly — no F5, no VS Code. We'll write a tiny throwaway script,
compile the project, run it, read the numbers, then delete it.

1. Create a **temporary** file **`src/engine/color.check.ts`** with exactly this:
   ```ts
   import { hexToHsl, hslToHex, contrastRatio, readableOn } from './color';

   console.log('round-trip #3ec6ff ->', hslToHex(hexToHsl('#3ec6ff')));
   console.log('contrast #ffffff/#000000 ->', contrastRatio('#ffffff', '#000000'));
   console.log('readableOn(#0b1a2b) ->', readableOn('#0b1a2b'));
   ```
2. Compile the project (this is the same `tsc` your `compile`/`watch` script runs; it emits JS into `out/`):
   ```powershell
   npx tsc -p ./
   ```
3. Run the compiled check with Node (note: `.js`, in `out/`, **not** the `.ts` source):
   ```powershell
   node ./out/engine/color.check.js
   ```
   **Expected output — exactly:**
   ```
   round-trip #3ec6ff -> #3ec6ff
   contrast #ffffff/#000000 -> 21
   readableOn(#0b1a2b) -> #ffffff
   ```
   Line 1 proves `hexToHsl → hslToHex` round-trips a real accent color losslessly. Line 2 proves the WCAG contrast
   of black-on-white is the theoretical maximum, `21`. Line 3 proves `readableOn` picks white text for a dark
   background.
4. **Delete `src/engine/color.check.ts`** now (and, if you like, `out/engine/color.check.js`). It was scaffolding to
   verify the math — it must **not** ship. Nothing imports it.

> *(One-liner alternative, no scratch file — after `npx tsc -p ./`:)*
> ```powershell
> node -e "const color=require('./out/engine/color'); console.log(color.hslToHex(color.hexToHsl('#3ec6ff')), color.contrastRatio('#ffffff','#000000'))"
> ```
> prints `#3ec6ff 21`.

## Done when (this step)
- `src/engine/color.ts` exists with the code above and compiles with no errors.
- Running the check prints `round-trip #3ec6ff -> #3ec6ff`, `contrast #ffffff/#000000 -> 21`, and
  `readableOn(#0b1a2b) -> #ffffff`.
- `src/engine/color.check.ts` has been deleted.

## If it breaks
- **`Cannot find module './out/engine/color.js'`** when running Node → the compile step didn't emit it. Confirm
  `npx tsc -p ./` ran with no errors and that `color.ts` really is under `src/engine/` (the output path mirrors the
  source path).
- **Node error `Cannot use import statement outside a module`** → you tried to `node` the **`.ts`** file. Node runs
  the **compiled `.js`** in `out/`, not TypeScript source. Re-run `npx tsc -p ./` then `node ./out/engine/...js`.
- **`contrast` prints something other than `21`** → a typo in `channelLuminance` or `contrastRatio`; the weights are
  `0.2126 / 0.7152 / 0.0722` and the ratio is `(brighter + 0.05) / (darker + 0.05)`. Compare against the block above.
- **`round-trip` prints a *slightly* different hex** (e.g. `#3ec6fe`) → a rounding/branch typo in `hslToHex`; check
  the `switch (Math.floor(hue / 60))` slice table and `rgbToHex`'s `Math.round`.

---
> Nav: — · [Overview](00_overview.md) · [Types →](02_types.md)
