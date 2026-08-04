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
    }

    private getHtml(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${ webview.cspSource } 'unsafe-inline';" />
  <title>Van Code</title>
</head>
<body>
  <h3>Van Code</h3>
  <p>The control panel will grow here.</p>
</body>
</html>`;
    }
}