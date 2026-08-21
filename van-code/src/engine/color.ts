// A color as the screen stores it: how much Red, Green and Blue light to emit, each 0-255.
export interface Rgb { r: number; g: number; b: number; }

// The same color described the way a human would: which color it is (hue, 0-360 degrees
// around a color wheel), how vivid (saturation, 0-1) and how bright (lightness, 0-1).
export interface Hsl { h: number; s: number; l: number; }

// Force a number back inside an allowed range, so we never produce an impossible color.
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Turn a CSS hex string like "#3aa" or "#33aaaa" into its three RGB numbers.
export function hexToRgb(hex: string): Rgb {
    const digits = hex.replace('#', '');
    const sixDigits = digits.length === 3
        // Shorthand hex repeats each digit: "#3aa" means exactly the same as "#33aaaa".
        ? digits.split('').map((digit) => digit + digit).join('')
        : digits;

    // Each channel is two hex digits, i.e. a base-16 number from 00 (none) to ff (255, full).
    return {
        r: parseInt(sixDigits.slice(0, 2), 16),
        g: parseInt(sixDigits.slice(2, 4), 16),
        b: parseInt(sixDigits.slice(4, 6), 16),
    };
}

// The reverse trip: three RGB numbers back into a hex string CSS can understand.
export function rgbToHex({ r, g, b }: Rgb): string {
    // Round to a whole 0-255 value and always write two digits ("f" would be invalid, "0f" is fine).
    const toHexPair = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
    return `#${ toHexPair(r) }${ toHexPair(g) }${ toHexPair(b) }`;
}

// Convert a hex color into hue/saturation/lightness, which is the form we can meaningfully
// tweak: "same color but brighter", "same color but duller" are one-number changes in HSL.
export function hexToHsl(hex: string): Hsl {
    const { r, g, b } = hexToRgb(hex);

    // The math below works on 0-1 fractions rather than 0-255 counts.
    const red = r / 255,
        green = g / 255,
        blue = b / 255,

        // The strongest and weakest of the three channels define the whole color's range.
        brightest = Math.max(red, green, blue),
        darkest = Math.min(red, green, blue),

        // Lightness sits halfway between them: all channels high = near white, all low = near black.
        lightness = (brightest + darkest) / 2,

        // Chroma is the gap between them, i.e. how far this color is from a plain grey.
        chroma = brightest - darkest;

    let hue = 0,
        saturation = 0;

    // Zero gap means every channel is equal: a grey, which has no hue and no saturation to compute.
    if (chroma !== 0) {

        // Very dark and very light colors can hold less chroma, so we measure the gap
        // against the most chroma this lightness could possibly have.
        const maxChromaAtThisLightness = lightness > 0.5
            ? 2 - brightest - darkest
            : brightest + darkest;
        saturation = chroma / maxChromaAtThisLightness;


        // Which channel wins tells us which third of the color wheel we are in; the other two
        // channels say how far along that third, giving a position from 0 to 6.
        switch (brightest) {
            case red:
                hue = ((green - blue) / chroma + (green < blue ? 6 : 0));
                break;
            case green:
                hue = ((blue - red) / chroma + 2);
                break;
            default:
                hue = ((red - green) / chroma + 4);
                break;
        }

        // Each of those 6 units is a 60 degree slice, so scaling gives the angle in degrees.
        hue *= 60;
    }

    return { h: hue, s: saturation, l: lightness };
}

// Convert a human-friendly HSL description back into a hex color for CSS.
export function hslToHex({ h, s, l }: Hsl): string {
    // Angles wrap around the wheel (370 degrees is 10 degrees); the other two are simple 0-1 amounts.
    const hue = ((h % 360) + 360) % 360,

        saturation = clamp(s, 0, 1),
        lightness = clamp(l, 0, 1),

        // How much color we can add at this lightness: none at pure black or pure white.
        chroma = (1 - Math.abs(2 * lightness - 1)) * saturation,

        // Every hue is a mix of two neighbouring primaries; this is the amount of the weaker one.
        secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1)),

        // The chroma above is centred on zero, so this shifts it up to the requested lightness.
        lightnessOffset = lightness - chroma / 2;

    let red = 0,
        green = 0,
        blue = 0;

    // The wheel is six 60 degree slices (red -> yellow -> green -> cyan -> blue -> magenta).
    // The slice decides which channel is the strong one and which is the weaker partner.
    switch (Math.floor(hue / 60)) {
        case 0:
            red = chroma;
            green = secondary;
            break;
        case 1:
            red = secondary;
            green = chroma;
            break;
        case 2:
            green = chroma;
            blue = secondary;
            break;
        case 3:
            green = secondary;
            blue = chroma;
            break;
        case 4:
            red = secondary;
            blue = chroma;
            break;
        default:
            red = chroma;
            blue = secondary;
            break;
    }

    // Lift all three channels to the target lightness, then scale from 0-1 back to 0-255.
    return rgbToHex({
        r: (red + lightnessOffset) * 255,
        g: (green + lightnessOffset) * 255,
        b: (blue + lightnessOffset) * 255,
    });
}

// The five tweaks below all do the same thing: describe the color in HSL, nudge one of the
// three numbers, convert back. `amount` is 0-1 for lightness/saturation (0.1 = a small nudge).

// Same color, closer to white.
export function lighten(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, l: hsl.l + amount });
}
// Same color, closer to black.
export function darken(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, l: hsl.l - amount });
}
// Same color, more vivid.
export function saturate(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, s: hsl.s + amount });
}
// Same color, more washed out and grey.
export function desaturate(hex: string, amount: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, s: hsl.s - amount });
}
// Spin around the color wheel, keeping vividness and brightness: blue -> purple -> red, etc.
export function rotate(hex: string, degrees: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, h: hsl.h + degrees });
}

// Swap in a completely different hue while keeping this color's vividness and brightness.
export function setHue(hex: string, hue: number): string {
    const hsl = hexToHsl(hex);
    return hslToHex({ ...hsl, h: hue });
}

// Blend two colors like paint. amount 0 = fully the first, 1 = fully the second, 0.5 = halfway.
export function mix(fromHex: string, toHex: string, amount: number): string {
    const from = hexToRgb(fromHex), to = hexToRgb(toHex);
    return rgbToHex({
        r: from.r + (to.r - from.r) * amount,
        g: from.g + (to.g - from.g) * amount,
        b: from.b + (to.b - from.b) * amount,
    });
}

// Screens don't emit light in proportion to their channel numbers; this undoes that curve so
// the result matches how much light actually reaches the eye. The formula is fixed by the spec.
function channelLuminance(channel: number): number {
    const normalized = channel / 255;
    return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
}


// How bright a color looks to a human, from 0 (black) to 1 (white). Green counts for far more
// than blue because our eyes are much more sensitive to it — hence the lopsided weights.
export function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}


// How strongly two colors stand apart, from 1 (identical, unreadable) to 21 (black on white).
// The accessibility rules ask for at least 4.5 for body text, 3 for large text.
export function contrastRatio(hexA: string, hexB: string): number {
    const luminanceA = relativeLuminance(hexA), luminanceB = relativeLuminance(hexB);
    const brighter = Math.max(luminanceA, luminanceB), darker = Math.min(luminanceA, luminanceB);
    // The +0.05 stops the ratio exploding towards infinity when one color is pure black.
    return (brighter + 0.05) / (darker + 0.05);
}


// Pick white or near-black text, whichever is easier to read on this background.
export function readableOn(background: string): string {
    return contrastRatio('#ffffff', background) >= contrastRatio('#111111', background)
        ? '#ffffff'
        : '#111111';
}

// Keep a chosen text color if it is already readable on its background; otherwise shift it
// lighter or darker (whichever works) until it clears the required contrast.
export function ensureContrast(foreground: string, background: string, targetRatio: number): string {
    if (contrastRatio(foreground, background) >= targetRatio) 
        return foreground;

    const lighter = walkLightness(foreground, background, targetRatio, +0.01);
    if (contrastRatio(lighter, background) >= targetRatio) 
        return lighter;

    const darker = walkLightness(foreground, background, targetRatio, -0.01);
    if (contrastRatio(darker, background) >= targetRatio) 
        return darker;

    // Neither direction reached the target, so return whichever got closest.
    return contrastRatio(lighter, background) >= contrastRatio(darker, background) ? lighter : darker;
}

// Nudge a color's brightness one small step at a time (hue and vividness untouched) until it
// contrasts enough with the background, or until it bottoms out at black / tops out at white.
function walkLightness(foreground: string, background: string, targetRatio: number, delta: number): string {
    let hsl = hexToHsl(foreground);
    
    for (let step = 0; step < 100; step++) {
        hsl = { ...hsl, l: clamp(hsl.l + delta, 0, 1) };
        const candidate = hslToHex(hsl);

        if (contrastRatio(candidate, background) >= targetRatio) 
            return candidate;

        if (hsl.l <= 0 || hsl.l >= 1)
             break;
    }
    
    return hslToHex(hsl);
}
