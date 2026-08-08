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
}

export interface StyleProfile {
    id: string;
    label: string;
    family: 'generative' | 'signature';
    variants?: string[];
    buildPalette(combo: StarterCombo, variant?: string): Palette;
}
