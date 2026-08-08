/**
 * Color math, from scratch. Two ways of describing the same color are used here:
 *
 * RGB — how screens work: three channels (red, green, blue), each 0–255, mixed as light.
 *       `#ff8800` is just those three numbers written in base 16 (two hex digits each).
 *       Good for displaying, terrible for asking "make this 10% lighter".
 *
 * HSL — how people think: three independent dials.
 *       h (hue)        0–360°, a position on the color wheel: 0 red, 60 yellow, 120 green,
 *                      180 cyan, 240 blue, 300 magenta, back to red at 360. It wraps around.
 *       s (saturation) 0–1, how colorful: 0 is gray, 1 is the most vivid version available.
 *       l (lightness)  0–1, how much black/white is mixed in: 0 is always black, 1 always
 *                      white, 0.5 is where colors are most vivid.
 *
 * Everything below converts between the two so the "dial" operations (lighten, saturate,
 * rotate) can be expressed in HSL while input and output stay hex, which is what CSS wants.
 */

export interface Rgb { r: number; g: number; b: number; }
export interface Hsl { h: number; s: number; l: number; }

/** Force `value` into the range [min, max]: below min -> min, above max -> max. */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Parse a CSS hex string into its three 0–255 channels.
 * `#f80` and `#ff8800` mean the same color: the 3-digit shorthand is just each digit doubled.
 */
export function hexToRgb(hex: string): Rgb {
    const digits = hex.replace('#', '');
    let sixDigits: string;

    switch (digits.length) {
        case 3:
            // Shorthand: "f80" -> "ff8800". Each digit stands for the pair "dd".
            sixDigits = digits.split('').map((digit) => digit + digit).join('');
            break;
        default:
            // Already two digits per channel (or malformed, in which case parseInt yields NaN).
            sixDigits = digits;
            break;
    }

    // Each channel is one base-16 pair: "ff" -> 255, "88" -> 136, "00" -> 0.
    return {
        r: parseInt(sixDigits.slice(0, 2), 16),
        g: parseInt(sixDigits.slice(2, 4), 16),
        b: parseInt(sixDigits.slice(4, 6), 16),
    };
}

/**
 * Write three channels back as a CSS hex string.
 * The channels arrive as floats here (color math produces things like 254.7 or -0.3), so each
 * one is rounded to a whole number and clamped into 0–255 before being written as two hex
 * digits — otherwise the string would come out the wrong length and stop being valid CSS.
 */
export function rgbToHex({ r, g, b }: Rgb): string {
    const toHexPair = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
    return `#${ toHexPair(r) }${ toHexPair(g) }${ toHexPair(b) }`;
}

/**
 * RGB -> HSL. The whole trick: sort the three channels and look at the two extremes.
 * Where they sit tells you the lightness, how far apart they are tells you the saturation,
 * and *which* channel won tells you the hue.
 */
export function hexToHsl(hex: string): Hsl {
    const { r, g, b } = hexToRgb(hex);

    // Work in 0–1 instead of 0–255 so the numbers line up with saturation/lightness.
    const red = r / 255,
        green = g / 255,
        blue = b / 255,

        // The strongest and weakest of the three channels. Only these two matter for s and l.
        brightest = Math.max(red, green, blue),
        darkest = Math.min(red, green, blue),

        // Lightness is the midpoint between them: white (1,1,1) -> 1, black (0,0,0) -> 0,
        // and any fully vivid color like pure red (1,0,0) -> 0.5.
        lightness = (brightest + darkest) / 2,

        // Chroma = how far apart the extremes are, i.e. how much color is present at all.
        // Gray means all three channels are equal, so chroma is 0 and there is no hue to find.
        chroma = brightest - darkest;

    let hue = 0,
        saturation = 0;

    if (chroma !== 0) {
        // Saturation is NOT chroma itself — it is chroma as a fraction of the most chroma this
        // color could possibly have at its lightness. That ceiling shrinks toward the ends of
        // the black-white axis: near black or near white the channels have no room to spread
        // apart, so even a small gap already means "as colorful as it gets down here".
        //
        // The ceiling is twice the distance from the nearest end of that axis:
        //   dark half  (l <= 0.5) -> 2 * l         which is  brightest + darkest
        //   light half (l >  0.5) -> 2 * (1 - l)   which is  2 - brightest - darkest
        // So the same chroma reports a higher saturation the closer it sits to black or white.
        const maxChromaAtThisLightness = lightness > 0.5
            ? 2 - brightest - darkest
            : brightest + darkest;
        saturation = chroma / maxChromaAtThisLightness;

        // Hue: the wheel is six 60° slices, and the channel that won says which pair of slices
        // we are in. Inside that pair the position comes from the *other* two channels'
        // difference divided by chroma, which lands in -1..+1 around the slice pair's center:
        //   red   wins -> centered on   0° (red),    green > blue climbs toward yellow
        //   green wins -> centered on 120° (green)
        //   blue  wins -> centered on 240° (blue)
        // The result is in slice units (0–6) and gets multiplied by 60 at the end.
        switch (brightest) {
            case red:
                // Below red's center the value would go negative (magenta would be -0.5), so
                // when blue outweighs green we add a full turn to land on 300–360 instead.
                hue = ((green - blue) / chroma + (green < blue ? 6 : 0));
                break;
            case green:
                hue = ((blue - red) / chroma + 2);
                break;
            default:
                // Blue is the brightest: `brightest` is by construction equal to one of the
                // three channels, so if it matched neither red nor green it must be blue.
                hue = ((red - green) / chroma + 4);
                break;
        }

        // Slices -> degrees.
        hue *= 60;
    }

    return { h: hue, s: saturation, l: lightness };
}

/**
 * HSL -> RGB hex, the inverse of `hexToHsl`.
 * Built in two steps: first the *shape* of the color (a triple with the right hue and
 * saturation, sitting at lightness 0.5), then one uniform shift that moves that triple to the
 * requested lightness.
 */
export function hslToHex({ h, s, l }: Hsl): string {
    // Hue is an angle, so it wraps instead of clamping: 400° is 40°, -30° is 330°. The double
    // modulo is needed because JS `%` keeps the sign of the left operand (-30 % 360 === -30).
    const hue = ((h % 360) + 360) % 360,

        // Saturation and lightness are plain 0–1 amounts, so out-of-range input is clipped.
        // This is what makes `lighten('#eeeeee', 0.5)` stop at white instead of overflowing.
        saturation = clamp(s, 0, 1),
        lightness = clamp(l, 0, 1),

        // Chroma: the gap between the strongest and weakest channel we are about to produce.
        // `1 - |2 * lightness - 1|` is the same ceiling described in `hexToHsl` — 1 at
        // lightness 0.5, tapering to 0 at pure black and pure white — and saturation asks for
        // a fraction of it. Same relationship as there, just solved for chroma instead.
        chroma = (1 - Math.abs(2 * lightness - 1)) * saturation,

        // Every hue has one channel at full chroma, one at zero, and one ramping in between —
        // that middle one is the "secondary". `(hue / 60) % 2` is the position inside the
        // current slice pair, and `1 - |… - 1|` makes it rise 0->1 then fall 1->0, which is
        // what turns the six corners (red, yellow, green, cyan, blue, magenta) into a smooth
        // wheel instead of six jumps.
        secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1)),

        // The triple built below is centered on lightness 0.5 (its own midpoint is chroma / 2).
        // Adding this offset to all three channels slides it up or down to the requested
        // lightness without changing the gaps between them, so hue and saturation survive.
        lightnessOffset = lightness - chroma / 2;

    let red = 0,
        green = 0,
        blue = 0;

    // Which 60° slice the hue falls in, 0–5. Since `hue` was wrapped into [0, 360) above,
    // dividing by 60 and truncating can only give 0, 1, 2, 3, 4 or 5.
    //
    // Per slice: the dominant channel gets the full chroma, the channel we are heading toward
    // gets the ramping secondary, the third one stays at 0.
    switch (Math.floor(hue / 60)) {
        case 0:
            // 0–60°: red -> yellow (green climbing).
            red = chroma;
            green = secondary;
            break;
        case 1:
            // 60–120°: yellow -> green (red fading).
            red = secondary;
            green = chroma;
            break;
        case 2:
            // 120–180°: green -> cyan (blue climbing).
            green = chroma;
            blue = secondary;
            break;
        case 3:
            // 180–240°: cyan -> blue (green fading).
            green = secondary;
            blue = chroma;
            break;
        case 4:
            // 240–300°: blue -> magenta (red climbing).
            red = secondary;
            blue = chroma;
            break;
        default:
            // 300–360°: magenta -> red (blue fading). Also the safety net for a non-finite hue.
            red = chroma;
            blue = secondary;
            break;
    }

    // Shift to the requested lightness, then scale 0–1 back up to the 0–255 that hex wants.
    return rgbToHex({
        r: (red + lightnessOffset) * 255,
        g: (green + lightnessOffset) * 255,
        b: (blue + lightnessOffset) * 255,
    });
}

// The dial operations: go to HSL, move exactly one dial, come back. Values that run past the
// ends are clipped (or wrapped, for hue) inside `hslToHex`, so nothing here can overflow.

/** Add white: `lighten('#3366cc', 0.1)` raises lightness by 10 points, capped at white. */
export function lighten(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, l: hsl.l + amount });
}
/** Add black: lowers lightness, floored at black. */
export function darken(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, l: hsl.l - amount });
}
/** More vivid: pushes saturation up, capped at the most colorful version of this hue. */
export function saturate(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, s: hsl.s + amount });
}
/** Closer to gray: pulls saturation down, floored at a pure gray of the same lightness. */
export function desaturate(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, s: hsl.s - amount });
}
/** Spin around the color wheel: +180 gives the opposite color, +360 gives back the original. */
export function rotate(hex: string, degrees: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, h: hsl.h + degrees });
}
/** Recolor while keeping the original saturation and lightness — hue is replaced, not moved. */
export function setHue(hex: string, hue: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, h: hue });
}
/**
 * Blend two colors: `amount` 0 returns `fromHex`, 1 returns `toHex`, 0.5 the halfway point.
 * This interpolates each RGB channel straight across (no HSL detour), which is the same
 * mixing CSS gradients do.
 */
export function mix(fromHex: string, toHex: string, amount: number): string {
    const from = hexToRgb(fromHex), to = hexToRgb(toHex);
    return rgbToHex({
        r: from.r + (to.r - from.r) * amount,
        g: from.g + (to.g - from.g) * amount,
        b: from.b + (to.b - from.b) * amount,
    });
}

/*
 * WCAG relative luminance + contrast ratio — the accessibility side, i.e. "is this text
 * actually readable on this background". Lightness (HSL) and luminance are not the same thing:
 * pure yellow and pure blue both sit at lightness 0.5, yet yellow is far brighter to the eye.
 * Readability needs this second measure.
 */

/**
 * Undo the sRGB gamma curve for one channel.
 * Channel values are not stored proportionally to physical light: the encoding spends more of
 * its precision on darks, matching how our eyes work. Averaging those raw numbers would be
 * meaningless, so each channel is first mapped back to linear light — the short straight
 * segment near 0 and the 2.4 power curve are the sRGB spec's own constants.
 */
function channelLuminance(channel: number): number {
    const normalized = channel / 255;
    return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * How much light the color emits overall, 0 (black) to 1 (white).
 * The three weights are not equal because the eye is not: green carries most of our
 * brightness perception (~72%), red much less (~21%), blue least of all (~7%).
 */
export function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/**
 * How far apart two colors are in brightness, as the WCAG ratio: 1 means identical, 21 is black
 * against white. The usual bars are 4.5 for body text and 3 for large text or UI edges. Order
 * of the arguments does not matter, and the +0.05 on both sides models the light that always
 * leaks off a real screen (it also keeps black-on-black from dividing by zero).
 */
export function contrastRatio(hexA: string, hexB: string): number {
    const luminanceA = relativeLuminance(hexA), luminanceB = relativeLuminance(hexB);
    const brighter = Math.max(luminanceA, luminanceB), darker = Math.min(luminanceA, luminanceB);
    return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Return near-black or near-white, whichever reads better on `background`.
 * Not quite pure #000/#fff, which look harsh; the crossover sits around a mid-gray background.
 */
export function readableOn(background: string): string {
    return contrastRatio('#ffffff', background) >= contrastRatio('#111111', background)
        ? '#ffffff'
        : '#111111';
}

/**
 * Nudge `foreground` lighter/darker until it hits `targetRatio` against `background`.
 * Only lightness moves, so the color keeps its hue and saturation — it stays recognizably the
 * same color, just readable. The direction comes from the background: on a dark background the
 * foreground has to climb toward white, on a light one sink toward black. Steps are 1 lightness
 * point at a time and stop at the first value that clears the bar; if the axis runs out first,
 * plain white or near-black is the best this color can do.
 */
export function ensureContrast(foreground: string, background: string, targetRatio: number): string {
    if (contrastRatio(foreground, background) >= targetRatio) {
        return foreground;
    }
    const goLighter = relativeLuminance(background) < 0.5;
    let hsl = hexToHsl(foreground);
    for (let step = 0; step < 100; step++) {
        hsl = { ...hsl, l: clamp(hsl.l + (goLighter ? 0.01 : -0.01), 0, 1) };
        const candidate = hslToHex(hsl);
        if (contrastRatio(candidate, background) >= targetRatio) {
            return candidate;
        }
        if (hsl.l <= 0 || hsl.l >= 1) {
            break;
        }
    }
    return goLighter ? '#ffffff' : '#111111';
}
