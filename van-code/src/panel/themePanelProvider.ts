import * as vscode from 'vscode';
import { ThemeHistory } from '../theme/history';
import { applyChrome } from '../theme/apply';

export class ThemePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vanCode.panel';

  constructor(private readonly history: ThemeHistory) { }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((m) => this.onMessage(m));
  }

  private async onMessage(m: { type: string; }): Promise<void> {
    switch (m.type) {
      case 'applyDemo':
        await this.history.apply(() =>
          applyChrome({
            'statusBar.background': '#e11d48',
            'statusBar.foreground': '#ffffff',
          }),
        );
        break;
      case 'revert':
        await this.history.revert();
        break;
      case 'reset':
        await this.history.reset();
        break;
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${ webview.cspSource } 'unsafe-inline'; script-src 'nonce-${ nonce }';" />
  <title>Van Code</title>
</head>
<body>
  <h3>Van Code</h3>
  <button id="apply">Apply demo (red status bar)</button>
  <button id="revert">Revert</button>
  <button id="reset">Reset</button>
  <script nonce="${ nonce }">
    const vscode = acquireVsCodeApi();
    document.getElementById('apply').addEventListener('click', () => vscode.postMessage({ type: 'applyDemo' }));
    document.getElementById('revert').addEventListener('click', () => vscode.postMessage({ type: 'revert' }));
    document.getElementById('reset').addEventListener('click', () => vscode.postMessage({ type: 'reset' }));
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
  return text;
}