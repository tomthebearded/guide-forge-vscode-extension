import * as vscode from 'vscode';
import { ThemeResult } from '../engine/types';
import { CHROME, SEMANTIC, TARGET, TOKENS } from './settings';

export async function applyChrome(chrome: Record<string, string>): Promise<void> {
    await vscode.workspace.getConfiguration(CHROME.section).update(CHROME.key, chrome, TARGET);
}

export async function applyTokens(tokens: ThemeResult['tokens'], languageId?: string): Promise<void> {
    const value = {
        comments: tokens.comments,
        keywords: tokens.keywords,
        strings: tokens.strings,
        numbers: tokens.numbers,
        types: tokens.types,
        functions: tokens.functions,
        variables: tokens.variables
    };
    const cfg = vscode.workspace.getConfiguration(TOKENS.section, languageId ? { languageId } : undefined);
    await cfg.update(TOKENS.key, value, TARGET, languageId ? true : undefined);
}

export async function applySemantic(semantic: ThemeResult['semantic'], languageId?: string): Promise<void> {
    const value = { enabled: true, rules: semantic };
    const cfg = vscode.workspace.getConfiguration(SEMANTIC.section, languageId ? { languageId } : undefined);
    await cfg.update(SEMANTIC.key, value, TARGET, languageId ? true : undefined);
}

export async function applyTheme(
    theme: Pick<ThemeResult, 'chrome' | 'tokens' | 'semantic'>,
    languageId?: string,
): Promise<void> {
    if (!languageId)
        await applyChrome(theme.chrome);
    
    await applyTokens(theme.tokens, languageId);
    await applySemantic(theme.semantic, languageId);
}
