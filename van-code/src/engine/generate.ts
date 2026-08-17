import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult, ThemeOverrides, TokenColors, SemanticColors } from './types';
import { overrideRoles } from './overrides';
import { readableOn, mix, rotate, ensureContrast, contrastRatio } from './color';

// "Chrome" is the editor's furniture — sidebar, tabs, status bar — everything except the code
// itself. This spreads the palette's handful of colors across the many keys VS Code expects.
function paletteToChrome(palette: Palette): ChromeColors {
    // The status bar is filled with the accent color, so its text has to be plain white or black.
    const onAccent = readableOn(palette.accent1);
    // Any text placed on a background gets nudged until it is comfortably readable
    // (4.5 is the accessibility bar for normal-sized text).
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
        // Inactive tabs use the muted text color so the file you are editing stands out.
        'tab.inactiveForeground': on(palette.textMuted, palette.surface),
        'editorGroupHeader.tabsBackground': palette.surface,
        'panel.background': palette.surface,
        'panel.border': palette.border,
        'focusBorder': palette.accent2,
    };
}

// The text-on-background pairs worth checking, as [label, foreground key, background key].
// Each entry names two of the keys produced above: "can you read this one against that one?".
const TEXT_PAIRS: Array<[string, string, string]> = [
    ['editor', 'editor.foreground', 'editor.background'],
    ['sideBar', 'sideBar.foreground', 'sideBar.background'],
    ['activityBar', 'activityBar.foreground', 'activityBar.background'],
    ['statusBar', 'statusBar.foreground', 'statusBar.background'],
    ['titleBar', 'titleBar.activeForeground', 'titleBar.activeBackground'],
    ['tab.active', 'tab.activeForeground', 'tab.activeBackground'],
    ['tab.inactive', 'tab.inactiveForeground', 'tab.inactiveBackground'],
];

// Quality check on a finished theme: report its least readable spot. A contrast ratio is 1 when
// two colors are identical (invisible) and 21 for black on white; higher is easier to read.
export function worstTextContrast(chrome: ChromeColors): { pair: string; ratio: number; editor: number; } {
    let worstPair = TEXT_PAIRS[0][0];
    let worstRatio = Infinity;
    // Walk every pair and keep the lowest ratio seen so far.
    for (const [label, foreground, background] of TEXT_PAIRS) {
        const ratio = contrastRatio(chrome[foreground], chrome[background]);
        if (ratio < worstRatio)
             worstRatio = ratio; worstPair = label;
    }
    // Report to two decimals; the raw ratios carry more precision than anyone needs to read.
    const round = (value: number) => Math.round(value * 100) / 100;
    return {
        pair: worstPair,
        ratio: round(worstRatio),
        // The editor pair is called out on its own because that is where you spend all your time.
        editor: round(contrastRatio(chrome['editor.foreground'], chrome['editor.background'])),
    };
}


// Colors for the code itself: one per category of thing the syntax highlighter recognizes.
function paletteToTokens(palette: Palette): TokenColors {
    // Code sits on the editor background; 4.5 is the readability bar used for it here.
    const readable = (hex: string) => ensureContrast(hex, palette.bg, 4.5);
    return {
        // Comments take the muted color so they recede behind the actual code.
        comments: readable(palette.textMuted),
        keywords: readable(palette.accent1),
        strings: readable(palette.accent2),
        // Numbers and types get their own shades by spinning an accent a little around the color
        // wheel: related enough to still belong to the theme, different enough to tell apart.
        numbers: readable(rotate(palette.accent2, 20)),
        types: readable(rotate(palette.accent1, -20)),
        // Functions are an accent blended 20% toward the plain text color, landing between the two.
        functions: readable(mix(palette.accent2, palette.text, 0.2)),
        variables: readable(palette.text),
    };
}

// Semantic highlighting is VS Code's smarter pass: the language server says "this word is a
// class", not just "this looks like a keyword". Each of its names reuses a token color above.
function paletteToSemantic(tokens: TokenColors): SemanticColors {
    return {
        variable: tokens.variables,
        parameter: tokens.variables,
        property: tokens.variables,
        function: tokens.functions,
        method: tokens.functions,
        class: tokens.types,
        type: tokens.types,
        interface: tokens.types,
        enum: tokens.types,
        keyword: tokens.keywords,
        string: tokens.strings,
        number: tokens.numbers,
        comment: tokens.comments,
    };
}

// Build a whole theme: the starter combo supplies the seed colors, the style profile decides how
// to expand them into a full palette, and everything else is derived from that palette.
export function generate(
    combo: StarterCombo,
    profile: StyleProfile,
    variant?: string,
    overrides?: ThemeOverrides,
): ThemeResult {
    // Overrides are the user's manual picks, applied on top of what was generated at each stage.
    const palette = overrideRoles(profile.buildPalette(combo, variant), overrides?.palette);
    // Tokens come after the palette override, so a hand-picked accent flows into the code colors too.
    const tokens = overrideRoles(paletteToTokens(palette), overrides?.tokens);
    return {
        palette,
        chrome: paletteToChrome(palette),
        tokens,
        semantic: overrideRoles(paletteToSemantic(tokens), overrides?.semantic),
    };
}

