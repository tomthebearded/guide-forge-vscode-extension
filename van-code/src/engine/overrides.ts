import { Hex } from './types';

const HEX_6 = /^#[0-9a-f]{6}$/i;

export function isHex(value: unknown): value is Hex {
    return typeof value === 'string' && HEX_6.test(value);
}

export function overrideRoles<T extends object>(base: T, chosen?: Partial<T>): T {
    if (!chosen)
        return base;

    const accepted: Record<string, Hex> = {};
    for (const [role, value] of Object.entries(chosen))
        if (isHex(value))
             accepted[role] = value;

    return { ...base, ...accepted } as T;
}
