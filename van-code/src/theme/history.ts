import * as vscode from 'vscode';
import { CHROME, SEMANTIC, TARGET, TOKENS } from './settings';

interface Snapshot { chrome: unknown; tokens: unknown; semantic: unknown; }

export class ThemeHistory {
    private stack: Snapshot[] = [];

    private capture(): Snapshot {
        const workbench = vscode.workspace.getConfiguration(CHROME.section);
        const editor = vscode.workspace.getConfiguration(TOKENS.section);
        return {
            chrome: workbench.inspect(CHROME.key)?.globalValue,
            tokens: editor.inspect(TOKENS.key)?.globalValue,
            semantic: editor.inspect(SEMANTIC.key)?.globalValue,
        };
    }


    private async restore(s: Snapshot): Promise<void> {
        const workbench = vscode.workspace.getConfiguration(CHROME.section);
        const editor = vscode.workspace.getConfiguration(TOKENS.section);
        await workbench.update(CHROME.key, s.chrome, TARGET);
        await editor.update(TOKENS.key, s.tokens, TARGET);
        await editor.update(SEMANTIC.key, s.semantic, TARGET);
    }
    
    async apply(fn: () => Promise<void>): Promise<void> {
        this.stack.push(this.capture());
        await fn();
    }

    async revert(): Promise<boolean> {
        const snap = this.stack.pop();
        if (!snap)
            return false;

        await this.restore(snap);
        return true;
    }

    async reset(): Promise<void> {
        await this.restore({ chrome: undefined, tokens: undefined, semantic: undefined });
        this.stack = [];
    }

    get depth(): number {
        return this.stack.length;
    }
}