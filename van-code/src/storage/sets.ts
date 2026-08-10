import * as vscode from 'vscode';
import { ChromeColors, SemanticColors, TokenColors } from '../engine/types';

export interface SavedSet {
    name: string;
    comboId: string;
    profileId: string;
    variant?: string;
    chrome: ChromeColors;
    tokens: TokenColors;
    semantic: SemanticColors;
}

const KEY = 'vanCode.savedSets';

export function listSets(ctx: vscode.ExtensionContext): SavedSet[] {
    return ctx.globalState.get<SavedSet[]>(KEY, []);
}

export async function saveSet(ctx: vscode.ExtensionContext, set: SavedSet): Promise<void> {
    const sets = listSets(ctx).filter((s) => s.name !== set.name);
    sets.push(set);
    await ctx.globalState.update(KEY, sets);
}

export async function deleteSet(ctx: vscode.ExtensionContext, name: string): Promise<void> {
    await ctx.globalState.update(KEY, listSets(ctx).filter((s) => s.name !== name));
}

export function exportSets(ctx: vscode.ExtensionContext): string {
    return JSON.stringify(listSets(ctx), null, 2);
}

export async function importSets(ctx: vscode.ExtensionContext, json: string): Promise<number> {
    const incoming = JSON.parse(json) as SavedSet[];

    if (!Array.isArray(incoming))
        throw new Error('Expected a JSON array of sets.');

    const byName = new Map(listSets(ctx).map((s) => [s.name, s]));
    for (const s of incoming)
        byName.set(s.name, s);
    
    const merged = [...byName.values()];
    await ctx.globalState.update(KEY, merged);
    return incoming.length;
}
