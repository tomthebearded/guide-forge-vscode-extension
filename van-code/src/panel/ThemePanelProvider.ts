import * as vscode from 'vscode';

export class ThemePanelProvider implements vscode.WebviewViewProvider {
    // Must match the view id declared in package.json (contributes.views).
    public static readonly viewType = 'vanCode.panel';

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        // Allow the page to run scripts (needed from step 08 on).
        webviewView.webview.options = { enableScripts: true };

        // Fill the panel with our HTML.
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