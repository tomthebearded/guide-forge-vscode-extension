import * as vscode from 'vscode';
import { CHROME, TOKENS, SEMANTIC, TARGET } from './settings';
import { ThemeResult } from '../engine/types';

const TEXTMATE_ROOT: Record<string, string> = {
    typescript: 'source.ts',
    typescriptreact: 'source.tsx',
    javascript: 'source.js',
    javascriptreact: 'source.js.jsx',
    csharp: 'source.cs',
    cpp: 'source.cpp',
    shellscript: 'source.shell',
    json: 'source.json',
    jsonc: 'source.json.comments',
    yaml: 'source.yaml',
    html: 'text.html.basic',
    markdown: 'text.html.markdown',
};

const TOKEN_SCOPES: Array<[keyof ThemeResult['tokens'], string[]]> = [
    ['comments', ['comment']],
    ['keywords', ['keyword', 'storage']],
    ['strings', ['string']],
    ['numbers', ['constant.numeric']],
    ['types', ['entity.name.type', 'support.type']],
    ['functions', ['entity.name.function', 'support.function']],
    ['variables', ['variable']],
];

function rootScope(languageId: string): string {
    return TEXTMATE_ROOT[languageId] || `source.${ languageId }`;
}

export async function applyChrome(chrome: Record<string, string>): Promise<void> {
    await vscode.workspace.getConfiguration(CHROME.section).update(CHROME.key, chrome, TARGET);
}

export async function applyTokens(tokens: ThemeResult['tokens'], languageId?: string): Promise<void> {
    const value = languageId
        ? {
            textMateRules: TOKEN_SCOPES.map(([role, scopes]) => ({
                name: `van-code ${ role } (${ languageId })`,
                scope: scopes.map((scope) => `${ rootScope(languageId) } ${ scope }`),
                settings: { foreground: tokens[role] },
            })),
        }
        : {
            comments: tokens.comments, 
            keywords: tokens.keywords, 
            strings: tokens.strings,
            numbers: tokens.numbers, 
            types: tokens.types, 
            functions: tokens.functions,
            variables: tokens.variables,
        };
    await vscode.workspace.getConfiguration(TOKENS.section).update(TOKENS.key, value, TARGET);
}


export async function applySemantic(semantic: ThemeResult['semantic'], languageId?: string): Promise<void> {
    const rules: Record<string, string> = {};
    for (const [tokenType, hex] of Object.entries(semantic)) 
        rules[languageId ? `${ tokenType }:${ languageId }` : tokenType] = hex;
    
    await vscode.workspace.getConfiguration(SEMANTIC.section)
        .update(SEMANTIC.key, { enabled: true, rules }, TARGET);
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
