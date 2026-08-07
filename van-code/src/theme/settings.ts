import * as vscode from 'vscode';

export const CHROME = { section: 'workbench', key: 'colorCustomizations' } as const;
export const TOKENS = { section: 'editor', key: 'tokenColorCustomizations' } as const;
export const SEMANTIC = { section: 'editor', key: 'semanticTokenColorCustomizations' } as const;

export const TARGET = vscode.ConfigurationTarget.Global;