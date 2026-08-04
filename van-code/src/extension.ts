import * as vscode from 'vscode';
import { ThemePanelProvider } from './panel/ThemePanelProvider';

export function activate(context: vscode.ExtensionContext): void {
	const provider = new ThemePanelProvider();

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ThemePanelProvider.viewType, provider),
	);
}

export function deactivate(): void { }