import * as vscode from 'vscode';
import { CHROME, TARGET } from './settings';

interface Snapshot { chrome: unknown; }

export class ThemeHistory {
    private stack: Snapshot[] = [];

    private capture(): Snapshot {
        const wb = vscode.workspace.getConfiguration(CHROME.section);
        return {
            chrome: wb.inspect(CHROME.key)?.globalValue,
        };
    }

    private async restore(s: Snapshot): Promise<void> {
        const wb = vscode.workspace.getConfiguration(CHROME.section);
        await wb.update(CHROME.key, s.chrome, TARGET);
    }

    async apply(fn: () => Promise<void>): Promise<void> {
        this.stack.push(this.capture());
        await fn();
    }

    async revert(): Promise<boolean> {
        const snap = this.stack.pop();
        if (!snap) {
            return false;
        }
        await this.restore(snap);
        return true;
    }

    async reset(): Promise<void> {
        await this.restore({ chrome: undefined });
        this.stack = [];
    }

    get depth(): number {
        return this.stack.length;
    }
}