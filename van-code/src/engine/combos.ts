import { StarterCombo } from './types';

export const COMBOS: StarterCombo[] = [
    {
        id: 'deep-sea',
        label: 'Deep Sea',
        bg: '#0b1a2b',
        surface: '#13293d',
        text: '#dbe9f4',
        accent1: '#3ec6ff',
        accent2: '#5eead4'
    },
    {
        id: 'ember',
        label: 'Ember',
        bg: '#1b1210',
        surface: '#2a1a15',
        text: '#f6e7dd',
        accent1: '#ff7849',
        accent2: '#ffd24c'
    },
    {
        id: 'grove',
        label: 'Grove',
        bg: '#0f1f17',
        surface: '#183025',
        text: '#e4f2ea',
        accent1: '#5fd68b',
        accent2: '#b8d96a'
    },
    {
        id: 'orchid',
        label: 'Orchid',
        bg: '#170f22',
        surface: '#241634',
        text: '#efe6f7',
        accent1: '#c084fc',
        accent2: '#ff77c8'
    },
    {
        id: 'graphite',
        label: 'Graphite',
        bg: '#17191c',
        surface: '#212429',
        text: '#e6e8ea',
        accent1: '#7dd3fc',
        accent2: '#9aa0a6'
    },
];

export function comboById(id: string): StarterCombo {
    return COMBOS.find((c) => c.id === id) ?? COMBOS[0];
}
