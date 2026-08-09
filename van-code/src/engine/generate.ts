import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult } from './types';
import { readableOn } from './color';

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

export function generate(combo: StarterCombo, profile: StyleProfile, variant?: string): ThemeResult {
    const palette = profile.buildPalette(combo, variant);
    return {
        palette,
        chrome: paletteToChrome(palette),
    };
}
