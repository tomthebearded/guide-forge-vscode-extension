import {
    Palette,
    StarterCombo,
    StyleProfile
} from './types';
import {
    darken,
    lighten,
    saturate,
    desaturate,
    setHue,
    mix,
    ensureContrast
} from './color';

function base(combo: StarterCombo): Palette {
    return {
        bg: combo.bg,
        surface: combo.surface,
        surfaceAlt: lighten(combo.surface,
            0.04),
        text: combo.text,
        textMuted: mix(combo.text,
            combo.surface,
            0.5),
        accent1: combo.accent1,
        accent2: combo.accent2,
        border: mix(combo.surface,
            combo.text,
            0.15),
    };
}

export const GENERATIVE: StyleProfile[] = [
    {
        id: 'neon',
        label: 'Neon',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            return {
                ...palette,
                bg: darken(palette.bg, 0.03),
                surface: darken(palette.surface, 0.02),
                accent1: saturate(lighten(palette.accent1, 0.05), 0.3),
                accent2: saturate(lighten(palette.accent2, 0.05), 0.3),
                text: lighten(palette.text, 0.02)
            };
        },
    },
    {
        id: 'pastel',
        label: 'Pastel',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            return {
                ...palette,
                surface: lighten(palette.surface, 0.06),
                surfaceAlt: lighten(palette.surfaceAlt, 0.06),
                accent1: lighten(desaturate(palette.accent1, 0.25), 0.12),
                accent2: lighten(desaturate(palette.accent2, 0.25), 0.12)
            };
        },
    },
    {
        id: 'midnight',
        label: 'Midnight / OLED',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            return {
                ...palette,
                bg: '#000000',
                surface: darken(palette.surface, 0.06),
                surfaceAlt: darken(palette.surfaceAlt, 0.05)
            };
        },
    },
    {
        id: 'warm-sepia',
        label: 'Warm Sepia',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            const warm = (hex: string, amount: number) => mix(hex, '#c98a3c', amount);
            return {
                ...palette,
                bg: warm(palette.bg, 0.10),
                surface: warm(palette.surface, 0.12),
                surfaceAlt: warm(palette.surfaceAlt, 0.12),
                text: warm(palette.text, 0.06),
                textMuted: warm(palette.textMuted, 0.10),
                accent1: setHue(palette.accent1, 32),
                accent2: setHue(palette.accent2, 44)
            };
        },
    },
    {
        id: 'material',
        label: 'Material',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            return {
                ...palette,
                bg: '#121212',
                surface: '#1e1e1e',
                surfaceAlt: '#242424',
                text: '#e0e0e0',
                textMuted: '#9e9e9e',
                accent1: saturate(palette.accent1, 0.05),
                accent2: saturate(palette.accent2, 0.05),
                border: '#2c2c2c'
            };
        },
    },
    {
        id: 'nature',
        label: 'Nature',
        family: 'generative',
        variants: ['ocean', 'forest'],
        buildPalette: (combo, variant = 'ocean') => {
            const palette = base(combo);
            const hue = variant === 'forest' ? 140 : 200;
            return {
                ...palette,
                bg: mix(palette.bg, setHue(palette.bg, hue), 0.5),
                surface: mix(palette.surface, setHue(palette.surface, hue), 0.5),
                accent1: setHue(palette.accent1, hue),
                accent2: setHue(palette.accent2, hue + (variant === 'forest' ? 40 : -30))
            };
        },
    },
    {
        id: 'high-contrast',
        label: 'High Contrast (AAA)',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            const bg = darken(palette.bg, 0.02);
            return {
                ...palette,
                bg,
                text: ensureContrast(palette.text, bg, 7),
                textMuted: ensureContrast(palette.textMuted, bg, 4.5),
                accent1: ensureContrast(saturate(palette.accent1, 0.1), bg, 7),
                accent2: ensureContrast(saturate(palette.accent2, 0.1), bg, 7),
                border: ensureContrast(palette.border, bg, 3)
            };
        },
    },
    {
        id: 'muted',
        label: 'Muted / Low-strain',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            return {
                ...palette,
                text: desaturate(darken(palette.text, 0.05), 0.1),
                accent1: desaturate(darken(palette.accent1, 0.05), 0.25),
                accent2: desaturate(darken(palette.accent2, 0.05), 0.25)
            };
        },
    },
    {
        id: 'monochrome',
        label: 'Monochrome + Accent',
        family: 'generative',
        buildPalette: (combo) => {
            const palette = base(combo);
            const gray = (hex: string) => desaturate(hex, 1);
            return {
                bg: gray(palette.bg),
                surface: gray(palette.surface),
                surfaceAlt: gray(palette.surfaceAlt),
                text: gray(palette.text),
                textMuted: gray(palette.textMuted),
                border: gray(palette.border),
                accent1: palette.accent1,
                accent2: palette.accent1
            };
        },
    }
];

export const PROFILES: StyleProfile[] = [...GENERATIVE];

export function profileById(id: string): StyleProfile {
    return PROFILES.find((profile) => profile.id === id) ?? PROFILES[0];
}
