import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult, ThemeOverrides, TokenColors, SemanticColors } from './types';
import { readableOn, mix, rotate, ensureContrast } from './color';
import { overrideRoles } from './overrides';


function paletteToChrome(palette: Palette): ChromeColors {
    return {
        'editor.background': palette.bg,
        'editor.foreground': palette.text,
        'sideBar.background': palette.surface,
        'sideBar.foreground': palette.text,
        'sideBarSectionHeader.background': palette.surfaceAlt,
        'activityBar.background': palette.surfaceAlt,
        'activityBar.foreground': palette.accent1,
        'activityBar.activeBorder': palette.accent1,
        'statusBar.background': palette.accent1,
        'statusBar.foreground': readableOn(palette.accent1),
        'titleBar.activeBackground': palette.surfaceAlt,
        'titleBar.activeForeground': palette.text,
        'tab.activeBackground': palette.bg,
        'tab.inactiveBackground': palette.surface,
        'tab.activeForeground': palette.text,
        'tab.inactiveForeground': palette.textMuted,
        'editorGroupHeader.tabsBackground': palette.surface,
        'panel.background': palette.surface,
        'panel.border': palette.border,
        'focusBorder': palette.accent2,
    };
}

function paletteToTokens(palette: Palette): TokenColors {
    const readable = (hex: string) => ensureContrast(hex, palette.bg, 3);
    return {
        comments: readable(palette.textMuted),
        keywords: readable(palette.accent1),
        strings: readable(palette.accent2),
        numbers: readable(rotate(palette.accent2, 20)),
        types: readable(rotate(palette.accent1, -20)),
        functions: readable(mix(palette.accent2, palette.text, 0.2)),
        variables: readable(palette.text),
    };
}

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

export function generate(
    combo: StarterCombo,
    profile: StyleProfile,
    variant?: string,
    overrides?: ThemeOverrides,
): ThemeResult {
    const palette = overrideRoles(profile.buildPalette(combo, variant), overrides?.palette);
    const tokens = overrideRoles(paletteToTokens(palette), overrides?.tokens);
    return {
        palette,
        chrome: paletteToChrome(palette),
        tokens,
        semantic: overrideRoles(paletteToSemantic(tokens), overrides?.semantic),
    };
}

