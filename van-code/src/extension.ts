import * as vscode from 'vscode';
import { ThemePanelProvider } from './panel/themePanelProvider';
import { ThemeHistory } from './theme/history';

export function activate(context: vscode.ExtensionContext): void {
	const history = new ThemeHistory();
	const provider = new ThemePanelProvider(context.extensionUri, context, history);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ThemePanelProvider.viewType, provider),
	);
}

export function deactivate(): void { }