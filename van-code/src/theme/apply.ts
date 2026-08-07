import * as vscode from 'vscode';
import { CHROME, TARGET } from './settings';

export async function applyChrome(chrome: Record<string, string>): Promise<void> {
    await vscode.workspace.getConfiguration(CHROME.section).update(CHROME.key, chrome, TARGET);
}