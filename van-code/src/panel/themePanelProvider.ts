import * as vscode from 'vscode';
import { COMBOS, comboById } from '../engine/combos';
import { generate, worstTextContrast } from '../engine/generate';
import { PROFILES, profileById } from '../engine/profiles';
import { SavedSet, deleteSet, exportSets, importSets, listSets, saveSet } from '../storage/sets';
import { applyTheme } from '../theme/apply';
import { ThemeHistory } from '../theme/history';


export class ThemePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vanCode.panel';

  private view?: vscode.WebviewView;
  private last?: { comboId: string; profileId: string; variant?: string; };

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
    private readonly history: ThemeHistory,
  ) { }


  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((m) => this.onMessage(m));
  }

  private post(message: unknown): void {
    this.view?.webview.postMessage(message);
  }

  private async onMessage(m: any): Promise<void> {
    switch (m.type) {
      case 'ready':
        this.post({
          type: 'init',
          combos: COMBOS.map((c) => ({ id: c.id, label: c.label })),
          profiles: PROFILES.map((p) => ({ id: p.id, label: p.label, family: p.family, variants: p.variants })),
          savedSets: listSets(this.context).map((s) => s.name),
        });
        break;
      case 'apply': {
        this.last = {
          comboId: m.comboId,
          profileId: m.profileId,
          variant: m.variant
        };
        const theme = generate(comboById(m.comboId), profileById(m.profileId), m.variant);
        await this.history.apply(() => applyTheme(theme, m.languageId || undefined));
        this.post({
          type: 'applied',
          palette: theme.palette,
          contrast: worstTextContrast(theme.chrome),
        });
        break;
      }
      case 'revert':
        await this.history.revert();
        break;
      case 'reset':
        await this.history.reset();
        break;
      case 'save': {
        if (!this.last || !m.name)
          return;

        const theme = generate(comboById(this.last.comboId), profileById(this.last.profileId), this.last.variant);
        const set: SavedSet = {
          name: m.name,
          comboId: this.last.comboId,
          profileId: this.last.profileId,
          variant: this.last.variant,
          chrome: theme.chrome,
          tokens: theme.tokens,
          semantic: theme.semantic,
        };
        await saveSet(this.context, set);
        this.post({ type: 'savedSets', savedSets: listSets(this.context).map((s) => s.name) });
        break;
      }
      case 'applySet': {
        const set = listSets(this.context).find((s) => s.name === m.name);
        
        if (!set)
          return;

        await this.history.apply(() => applyTheme(set));
        break;
      }
      case 'delete':
        await deleteSet(this.context, m.name);
        this.post({
          type: 'savedSets',
          savedSets: listSets(this.context).map((s) => s.name)
        });
        break;
      case 'export': {
        const doc = await vscode.workspace.openTextDocument({
          language: 'json',
          content: exportSets(this.context)
        });
        await vscode.window.showTextDocument(doc);
        break;
      }
      case 'import': {
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: false,
          filters: { JSON: ['json'] }
        });

        if (!uris?.length)
          return;

        const bytes = await vscode.workspace.fs.readFile(uris[0]);
        const count = await importSets(this.context, Buffer.from(bytes).toString('utf8'));
        void vscode.window.showInformationMessage(`Van Code: imported ${ count } set(s).`);
        this.post({
          type: 'savedSets',
          savedSets: listSets(this.context).map((s) => s.name)
        });
        break;
      }
    }
  }


  private getHtml(webview: vscode.Webview): string {
    const nonce = this.getNonce();
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'styles.css'));
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${ webview.cspSource }; script-src 'nonce-${ nonce }';" />
  <link href="${ styleUri }" rel="stylesheet" />
  <title>Van Code</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${ nonce }" src="${ scriptUri }"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < 32; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }
}
