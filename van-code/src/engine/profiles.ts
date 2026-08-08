import { Palette, StarterCombo, StyleProfile } from './types';
import { darken, lighten, saturate, desaturate, mix } from './color';

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
];

export const PROFILES: StyleProfile[] = [...GENERATIVE];

export function profileById(id: string): StyleProfile {
    return PROFILES.find((profile) => profile.id === id) ?? PROFILES[0];
}
