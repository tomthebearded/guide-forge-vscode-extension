import * as vscode from 'vscode';
import { ThemeHistory } from '../theme/history';
import { applyChrome } from '../theme/apply';
import { COMBOS, comboById } from '../engine/combos';
import { GENERATIVE, profileById } from '../engine/profiles';
import { generate } from '../engine/generate';

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

  private async onMessage(m: { type: string; comboId?: string; profileId?: string; }): Promise<void> {
    switch (m.type) {
      case 'apply': {
        const theme = generate(comboById(m.comboId ?? ''), profileById(m.profileId ?? ''));
        await this.history.apply(() => applyChrome(theme.chrome));
        break;
      }
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
    const comboOpts = COMBOS.map((c) => `<option value="${ c.id }">${ c.label }</option>`).join('');
    const profOpts = GENERATIVE.map((p) => `<option value="${ p.id }">${ p.label }</option>`).join('');
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
  <p><label>Starter <select id="combo">${ comboOpts }</select></label></p>
  <p><label>Style <select id="profile">${ profOpts }</select></label></p>
  <button id="apply">Apply</button>
  <button id="revert">Revert</button>
  <button id="reset">Reset</button>
  <script nonce="${ nonce }">
    const vscode = acquireVsCodeApi();
    const combo = document.getElementById('combo');
    const profile = document.getElementById('profile');
    function apply() { vscode.postMessage({ type: 'apply', comboId: combo.value, profileId: profile.value }); }
    document.getElementById('apply').addEventListener('click', apply);
    combo.addEventListener('change', apply);
    profile.addEventListener('change', apply);
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
