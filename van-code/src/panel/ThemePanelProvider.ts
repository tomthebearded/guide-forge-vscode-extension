import * as vscode from 'vscode';

export class ThemePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vanCode.panel';

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      console.log('[Van Code] message from webview:', message);
    });
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
  <p>The control panel will grow here.</p>
  <button id="ping">Say hello to the extension</button>
  <script nonce="${ nonce }">
    const vscode = acquireVsCodeApi();
    document.getElementById('ping').addEventListener('click', () => {
      vscode.postMessage({ type: 'ping', text: 'hello from the webview' });
    });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}