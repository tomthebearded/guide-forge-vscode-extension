# M6 · Step 10 of 10 — Verify the milestone + file checkpoint
> Nav: [← Saved sets remember overrides](09_persist-overrides.md) · [Overview](00_overview.md) · [M7 → Packaging](../MILESTONE_7_packaging/00_overview.md)

## Done-when gate (run every check)
Checks 1–2 are pure engine and run in plain Node. Checks 3–9 run in the Extension Development Host
(<kbd>F5</kbd>) — open a **`.ts` file** in it first, because check 6 needs a language server.

> 💡 **The status bar is still the one surface that won't move under <kbd>F5</kbd>** — including when you pin
> `accent1`, the role it's derived from. The EDH is a debugged window, so `statusBar.debugging*` overrides
> `statusBar.background` ([D7](../foundation/decision-log.md#d7--m2s-demo-sets-the-status-bar-debugging-colors-the-m3-engine-map-does-not)).
> Your pin *is* landing — check the `settings.json` diff — and [M7's gate](../MILESTONE_7_packaging/02_verify.md)
> closes it for good by installing the `.vsix` in an ordinary window. Judge every check below on the other surfaces.

### 1. The merge is total (no F5)
```powershell
npm run compile
node -e "const {isHex,overrideRoles}=require('./out/engine/overrides.js');console.log('guard:',isHex('#0a0f1e'),isHex('#0A0F1E'),isHex('banana'),isHex('#0a0f1'),isHex(undefined));console.log('merge:',overrideRoles({bg:'#111111',text:'#eeeeee'},{bg:'#0a0f1e',text:'banana'}));console.log('undefined-safe:',overrideRoles({bg:'#111111'},{bg:undefined}));console.log('no-patch:',overrideRoles({bg:'#111111'}))"
```
**Expected, exactly:**
```
guard: true true false false false
merge: { bg: '#0a0f1e', text: '#eeeeee' }
undefined-safe: { bg: '#111111' }
no-patch: { bg: '#111111' }
```

### 2. A pinned role propagates through the whole derivation (no F5)
```powershell
node -e "const {generate}=require('./out/engine/generate.js');const {comboById}=require('./out/engine/combos.js');const {profileById}=require('./out/engine/profiles.js');const c=comboById('deep-sea'),p=profileById('neon');const plain=generate(c,p);const pinned=generate(c,p,undefined,{palette:{bg:'#0a0f1e'}});console.log('palette.bg          ',pinned.palette.bg);console.log('editor.background   ',pinned.chrome['editor.background']);console.log('tab.activeBackground',pinned.chrome['tab.activeBackground']);console.log('chrome keys:',Object.keys(pinned.chrome).length);console.log('junk ignored:',generate(c,p,undefined,{palette:{bg:'banana'}}).palette.bg===plain.palette.bg);console.log('untouched roles:',pinned.palette.accent1===plain.palette.accent1);const t=generate(c,p,undefined,{tokens:{keywords:'#ff0088'}});console.log('token->semantic:',t.tokens.keywords,t.semantic.keyword);const s=generate(c,p,undefined,{tokens:{keywords:'#ff0088'},semantic:{keyword:'#00ffaa'}});console.log('semantic wins:',s.tokens.keywords,s.semantic.keyword)"
```
**Expected, exactly:**
```
palette.bg           #0a0f1e
editor.background    #0a0f1e
tab.activeBackground #0a0f1e
chrome keys: 20
junk ignored: true
untouched roles: true
token->semantic: #ff0088 #ff0088
semantic wins: #ff0088 #00ffaa
```
The last two lines are merges ② and ③ from [step 03](03_generate-overrides.md): a token pin reaches the semantic
type derived from it, and a semantic pin overrules that. `chrome keys: 20` confirms the engine map is still the
20 keys M3 fixed — M6 changes the *values* in it, never its size ([D7](../foundation/decision-log.md#d7--m2s-demo-sets-the-status-bar-debugging-colors-the-m3-engine-map-does-not)).

### 3. All 28 pickers are there
- In the panel, scroll to **Fine-tune — chrome roles**: **8 rows** (`bg`, `surface`, `surfaceAlt`, `text`,
  `textMuted`, `accent1`, `accent2`, `border`).
- **Fine-tune — syntax token roles**: **7 rows** (`comments`, `keywords`, `strings`, `numbers`, `types`,
  `functions`, `variables`).
- **Semantic token types** is a collapsed line; click it → **13 rows** (`variable`, `parameter`, `property`,
  `function`, `method`, `class`, `type`, `interface`, `enum`, `keyword`, `string`, `number`, `comment`).
- **Expected:** every row has a name, a swatch, a 7-character hex box and a ↺; the swatches line up in a column;
  the 8 chrome swatches match the palette strip above.

### 4. Editing a role applies on release, and moves its whole derived group
- Click `bg`'s swatch and drag around the OS picker. **Expected:** **nothing applies while you drag.**
- Dismiss the picker. **Expected:** the editor background, tabs, sidebar and panel all change together; the palette
  strip redraws; the contrast badge recomputes; the `bg` label goes bold and its ↺ turns solid.

### 5. The hex box accepts colors and refuses everything else
- Type `#ff00aa` into `accent2`'s box, press <kbd>Enter</kbd> → **Expected:** applied, row pinned.
- Type `banana` into it, click away → **Expected:** red border on the box, the value snaps back to `#ff00aa`, and
  **the editor does not change**.

### 6. Token and semantic pins hit the code, not the chrome
- With a `.ts` file open, pin `comments` → **Expected:** comments recolor, chrome unchanged.
- Pin the token role `keywords` to `#ff0088` → keywords recolor; open the semantic group and **Expected:** the
  `keyword` row already shows `#ff0088` without you touching it.
- Pin the semantic `keyword` type to `#00ffaa` → **Expected:** keywords go green in the `.ts` file while the syntax
  group still reads `#ff0088`. ↺ it → back to pink.
- (On a file with no language server, semantic pins do nothing visible. That's M5's documented trap, not a failure.)

### 7. Pins survive a style change; the badge says how many
- With 3 roles pinned the footer reads **`3 pinned`** (amber) and **Clear all overrides** is enabled.
- Click through several **Style** chips → **Expected:** 25 roles change every time, your 3 stay put.
- ↺ one row → badge `2 pinned`, that row only returns to the formula.
- **Clear all overrides** → badge `0 pinned` (muted), button greys out, every row back to formula colors, one apply.

### 8. One snapshot per action — Revert and Reset unchanged
- Pin a role, then click **Revert** once → **Expected:** exactly one step back. (Many clicks needed = you wired
  `input` instead of `change`.)
- Pin `bg` red, ↺ it, then **Revert** once → **Expected:** the background returns to **red**. Revert steps back
  through *settings*, and one snapshot ago it was red; the badge still reads `0 pinned`. Working as designed.
- With 2 pins, click **Reset** → `settings.json` loses `workbench.colorCustomizations`,
  `editor.tokenColorCustomizations` and `editor.semanticTokenColorCustomizations` (keys deleted, not blanked). Click
  any Style chip → the theme returns **with your 2 pins**. Clear all *then* Reset for a blank slate.

### 9. Sets remember their pins, across a reload and a JSON round-trip
- Pin 3 mixed-group roles, save as `pinned-navy`, switch style, **Clear all** → different theme, `0 pinned`.
- Click `pinned-navy` → **Expected:** its colors return, the combo/style chips re-highlight to the set's selection,
  badge `3 pinned`, the three rows bold with their exact hexes. **Revert** once = one step back.
- **Developer: Reload Window**, click `pinned-navy` again → same result.
- **Export** → the JSON has an `"overrides"` object holding only the pinned roles. Delete the set, **Import** the
  file → **Expected:** toast `Van Code: imported 1 set(s).` and the set returns with its pins intact.

### 10. Per-language scoping works through the value, not through a `"[languageId]"` block
> This check exists because of the 2026-08-16 amendment. If you started the guide after that date, the corrections
> section at the top of [step 01](01_types-overrides.md) does not apply to you, but this check still does — it is
> how the shipped guide proves the feature.

- Open a `.ts` file and a `.js` file side by side. Type `typescript` into the **Per-language (tokens only)** box,
  then pick any combo/style.
- **Expected:** no error in the extension-host console. In `settings.json`,
  `editor.tokenColorCustomizations` holds a `textMateRules` array whose `scope` entries begin `source.ts ` —
  `source.ts comment`, `source.ts keyword`, and so on — and `editor.semanticTokenColorCustomizations.rules` has
  keys suffixed `:typescript`. **No `"[typescript]"` block exists anywhere in the file.**
- **Expected in the editor:** the `.ts` file recolors; the `.js` file beside it does **not**; the chrome is
  unchanged by this apply.
- Click **Revert** once → the scoped value is undone in one step (the write was one whole-value replace, so M2's
  snapshot captured it whole).
- Clear the box and apply again → tokens recolor every language, and `editor.tokenColorCustomizations` is back to
  the seven named keys.

If all ten pass, **M6 is done.**

## What's automatable vs. checked by hand
- **Engine (pure, no F5):** checks 1–2 prove the guard, the merge, the `undefined` trap, and all three merge points
  propagating in the right order. That is the whole `src/engine/` half of this milestone, verified without VS Code.
- **Everything else you check by hand in the EDH:** the 28 rows, the `change`-not-`input` timing, the hex
  validation, live recoloring, the badge, Revert/Reset semantics, and persistence — all need the running extension
  and a real color picker, and can't be simulated from this guide.

## Files after this milestone (complete contents)
The files **created or modified in M6**. Unchanged since earlier milestones and **not repeated here**:
`src/engine/color.ts`, `combos.ts`, `profiles.ts` (M3–M4), `src/theme/settings.ts`, `history.ts` (M2/M5 — **M6's
own steps touch neither**), `src/extension.ts` (M5), `media/icon.svg` (M1), and `package.json` (M1; M7 edits it).
`src/theme/apply.ts` **is** reproduced below: M6's steps don't touch it, but the corrections section at the top of
[step 01](01_types-overrides.md) rewrites two of its functions, so this is the canonical copy to check yourself
against.

### `src/engine/types.ts`
```ts
export type Hex = string;

export interface StarterCombo {
  id: string;
  label: string;
  bg: Hex;
  surface: Hex;
  text: Hex;
  accent1: Hex;
  accent2: Hex;
}

// 8 coordinated roles every profile produces.
export interface Palette {
  bg: Hex;
  surface: Hex;
  surfaceAlt: Hex;
  text: Hex;
  textMuted: Hex;
  accent1: Hex;
  accent2: Hex;
  border: Hex;
}

export type ChromeColors = Record<string, Hex>;

export interface TokenColors {
  comments: Hex; keywords: Hex; strings: Hex; numbers: Hex;
  types: Hex; functions: Hex; variables: Hex;
}
export type SemanticColors = Record<string, Hex>;

export interface ThemeResult {
  palette: Palette;
  chrome: ChromeColors;
  tokens: TokenColors;
  semantic: SemanticColors;
}

// Your hand-picked colors, layered over whatever the profile computed.
// Sparse on purpose: a role that isn't here is a role the formula still owns.
export interface ThemeOverrides {
  palette?: Partial<Palette>;      // any subset of the 8 chrome roles
  tokens?: Partial<TokenColors>;   // any subset of the 7 syntax-token roles
  // SemanticColors is already Record<string, Hex> — a partial by construction.
  semantic?: SemanticColors;       // any subset of the 13 semantic token types
}

export interface StyleProfile {
  id: string;
  label: string;
  family: 'generative' | 'signature';
  variants?: string[];
  buildPalette(combo: StarterCombo, variant?: string): Palette;
}
```

### `src/engine/overrides.ts`
```ts
import { Hex } from './types';

// A color arriving from the webview is untrusted text — you can type anything
// into the hex box. Exactly 7 chars, '#' + 6 hex digits, is a color. Nothing else is.
const HEX_6 = /^#[0-9a-f]{6}$/i;

export function isHex(value: unknown): value is Hex {
  return typeof value === 'string' && HEX_6.test(value);
}

// Copy `base`, then let every VALID hex in `chosen` win. A role that's missing — or
// holding junk — keeps the formula's value. That is also how "un-pin this role" is
// expressed: delete the key. Never send '' or null; there is no third state.
export function overrideRoles<T extends object>(base: T, chosen?: Partial<T>): T {
  if (!chosen) return base;
  const accepted: Record<string, Hex> = {};
  for (const [role, value] of Object.entries(chosen)) {
    if (isHex(value)) accepted[role] = value;
  }
  // Shape-preserving by construction: every key came from `chosen`, which is a Partial<T>.
  return { ...base, ...accepted } as T;
}
```

### `src/engine/generate.ts`
```ts
import { ChromeColors, Palette, StarterCombo, StyleProfile, ThemeResult, ThemeOverrides, TokenColors, SemanticColors } from './types';
import { readableOn, mix, rotate, ensureContrast } from './color';
import { overrideRoles } from './overrides';

function paletteToChrome(palette: Palette): ChromeColors {
  const onAccent = readableOn(palette.accent1);
  return {
    'editor.background': palette.bg,
    'editor.foreground': palette.text,
    'sideBar.background': palette.surface,
    'sideBar.foreground': palette.text,
    'sideBarSectionHeader.background': palette.surfaceAlt,
    'activityBar.background': palette.surfaceAlt,
    'activityBar.foreground': palette.accent1,
    'activityBar.activeBorder': palette.accent1,
    'statusBar.background': palette.accent1,
    'statusBar.foreground': onAccent,
    'titleBar.activeBackground': palette.surfaceAlt,
    'titleBar.activeForeground': palette.text,
    'tab.activeBackground': palette.bg,
    'tab.inactiveBackground': palette.surface,
    'tab.activeForeground': palette.text,
    'tab.inactiveForeground': palette.textMuted,
    'editorGroupHeader.tabsBackground': palette.surface,
    'panel.background': palette.surface,
    'panel.border': palette.border,
    'focusBorder': palette.accent2,
  };
}

function paletteToTokens(palette: Palette): TokenColors {
  const readable = (hex: string) => ensureContrast(hex, palette.bg, 3);
  return {
    comments: readable(palette.textMuted),
    keywords: readable(palette.accent1),
    strings: readable(palette.accent2),
    numbers: readable(rotate(palette.accent2, 20)),
    types: readable(rotate(palette.accent1, -20)),
    functions: readable(mix(palette.accent2, palette.text, 0.2)),
    variables: readable(palette.text),
  };
}

function paletteToSemantic(tokens: TokenColors): SemanticColors {
  return {
    variable: tokens.variables, parameter: tokens.variables, property: tokens.variables,
    function: tokens.functions, method: tokens.functions,
    class: tokens.types, type: tokens.types, interface: tokens.types, enum: tokens.types,
    keyword: tokens.keywords, string: tokens.strings, number: tokens.numbers, comment: tokens.comments,
  };
}

export function generate(
  combo: StarterCombo,
  profile: StyleProfile,
  variant?: string,
  overrides?: ThemeOverrides,
): ThemeResult {
  // ① pinned palette roles win before anything is derived from the palette
  const palette = overrideRoles(profile.buildPalette(combo, variant), overrides?.palette);
  // ② pinned token roles win before the semantic map is fanned out from them
  const tokens = overrideRoles(paletteToTokens(palette), overrides?.tokens);
  return {
    palette,
    chrome: paletteToChrome(palette),
    tokens,
    // ③ pinned semantic types win last, so they can disagree with ②
    semantic: overrideRoles(paletteToSemantic(tokens), overrides?.semantic),
  };
}
```

### `src/theme/apply.ts`
> Unchanged by M6's own steps. This is the file **after** the corrections at the top of
> [step 01](01_types-overrides.md) — `applyChrome` and `applyTheme` are exactly as M2/M5 wrote them; `applyTokens`
> and `applySemantic` are the amended versions.

```ts
import * as vscode from 'vscode';
import { CHROME, TOKENS, SEMANTIC, TARGET } from './settings';
import { ThemeResult } from '../engine/types';

// A TextMate root scope names the grammar, not the language: `typescript` is tokenized by `source.ts`.
// Only the ids that differ need an entry; everything else falls back to `source.<languageId>`.
const TEXTMATE_ROOT: Record<string, string> = {
  typescript: 'source.ts',
  typescriptreact: 'source.tsx',
  javascript: 'source.js',
  javascriptreact: 'source.js.jsx',
  csharp: 'source.cs',
  cpp: 'source.cpp',
  shellscript: 'source.shell',
  json: 'source.json',
  jsonc: 'source.json.comments',
  yaml: 'source.yaml',
  html: 'text.html.basic',
  markdown: 'text.html.markdown',
};

// The seven named groups of `editor.tokenColorCustomizations`, written out as the TextMate scopes they
// stand for — this is what lets us qualify each one with a language root.
const TOKEN_SCOPES: Array<[keyof ThemeResult['tokens'], string[]]> = [
  ['comments', ['comment']],
  ['keywords', ['keyword', 'storage']],
  ['strings', ['string']],
  ['numbers', ['constant.numeric']],
  ['types', ['entity.name.type', 'support.type']],
  ['functions', ['entity.name.function', 'support.function']],
  ['variables', ['variable']],
];

function rootScope(languageId: string): string {
  return TEXTMATE_ROOT[languageId] || `source.${languageId}`;
}

export async function applyChrome(chrome: Record<string, string>): Promise<void> {
  await vscode.workspace.getConfiguration(CHROME.section).update(CHROME.key, chrome, TARGET);
}

export async function applyTokens(tokens: ThemeResult['tokens'], languageId?: string): Promise<void> {
  const value = languageId
    ? {
        textMateRules: TOKEN_SCOPES.map(([role, scopes]) => ({
          name: `van-code ${role} (${languageId})`,
          scope: scopes.map((scope) => `${rootScope(languageId)} ${scope}`),
          settings: { foreground: tokens[role] },
        })),
      }
    : {
        comments: tokens.comments, keywords: tokens.keywords, strings: tokens.strings,
        numbers: tokens.numbers, types: tokens.types, functions: tokens.functions,
        variables: tokens.variables,
      };
  await vscode.workspace.getConfiguration(TOKENS.section).update(TOKENS.key, value, TARGET);
}

export async function applySemantic(semantic: ThemeResult['semantic'], languageId?: string): Promise<void> {
  const rules: Record<string, string> = {};
  for (const [tokenType, hex] of Object.entries(semantic)) {
    rules[languageId ? `${tokenType}:${languageId}` : tokenType] = hex;
  }
  await vscode.workspace.getConfiguration(SEMANTIC.section)
    .update(SEMANTIC.key, { enabled: true, rules }, TARGET);
}

// Accepts anything carrying the three color maps — a generated ThemeResult OR a saved set.
export async function applyTheme(
  theme: Pick<ThemeResult, 'chrome' | 'tokens' | 'semantic'>,
  languageId?: string,
): Promise<void> {
  if (!languageId) { await applyChrome(theme.chrome); } // chrome can't be language-scoped, at all
  await applyTokens(theme.tokens, languageId);
  await applySemantic(theme.semantic, languageId);
}
```

### `src/storage/sets.ts`
```ts
import * as vscode from 'vscode';
import { ChromeColors, TokenColors, SemanticColors, ThemeOverrides } from '../engine/types';

export interface SavedSet {
  name: string;
  comboId: string;
  profileId: string;
  variant?: string;
  overrides?: ThemeOverrides;
  chrome: ChromeColors;
  tokens: TokenColors;
  semantic: SemanticColors;
}

const KEY = 'vanCode.savedSets';

export function listSets(ctx: vscode.ExtensionContext): SavedSet[] {
  return ctx.globalState.get<SavedSet[]>(KEY, []);
}

export async function saveSet(ctx: vscode.ExtensionContext, set: SavedSet): Promise<void> {
  const sets = listSets(ctx).filter((s) => s.name !== set.name);
  sets.push(set);
  await ctx.globalState.update(KEY, sets);
}

export async function deleteSet(ctx: vscode.ExtensionContext, name: string): Promise<void> {
  await ctx.globalState.update(KEY, listSets(ctx).filter((s) => s.name !== name));
}

export function exportSets(ctx: vscode.ExtensionContext): string {
  return JSON.stringify(listSets(ctx), null, 2);
}

export async function importSets(ctx: vscode.ExtensionContext, json: string): Promise<number> {
  const incoming = JSON.parse(json) as SavedSet[];
  if (!Array.isArray(incoming)) throw new Error('Expected a JSON array of sets.');
  const byName = new Map(listSets(ctx).map((s) => [s.name, s]));
  for (const s of incoming) byName.set(s.name, s);
  const merged = [...byName.values()];
  await ctx.globalState.update(KEY, merged);
  return incoming.length;
}
```

### `src/panel/ThemePanelProvider.ts`
```ts
import * as vscode from 'vscode';
import { ThemeHistory } from '../theme/history';
import { applyTheme } from '../theme/apply';
import { COMBOS, comboById } from '../engine/combos';
import { PROFILES, profileById } from '../engine/profiles';
import { generate } from '../engine/generate';
import { ThemeOverrides } from '../engine/types';
import { contrastRatio } from '../engine/color';
import { listSets, saveSet, deleteSet, exportSets, importSets, SavedSet } from '../storage/sets';

export class ThemePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vanCode.panel';

  private view?: vscode.WebviewView;
  private last?: { comboId: string; profileId: string; variant?: string; overrides?: ThemeOverrides };

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
    private readonly history: ThemeHistory,
  ) {}

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
        this.last = { comboId: m.comboId, profileId: m.profileId, variant: m.variant, overrides: m.overrides };
        const theme = generate(comboById(m.comboId), profileById(m.profileId), m.variant, m.overrides);
        await this.history.apply(() => applyTheme(theme, m.languageId || undefined));
        this.post({
          type: 'applied',
          palette: theme.palette,
          tokens: theme.tokens,
          semantic: theme.semantic,
          contrast: Math.round(contrastRatio(theme.palette.text, theme.palette.bg) * 100) / 100,
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
        if (!this.last || !m.name) return;
        const theme = generate(
          comboById(this.last.comboId), profileById(this.last.profileId), this.last.variant, this.last.overrides,
        );
        const set: SavedSet = {
          name: m.name, comboId: this.last.comboId, profileId: this.last.profileId, variant: this.last.variant,
          overrides: this.last.overrides,
          chrome: theme.chrome, tokens: theme.tokens, semantic: theme.semantic,
        };
        await saveSet(this.context, set);
        this.post({ type: 'savedSets', savedSets: listSets(this.context).map((s) => s.name) });
        break;
      }
      case 'applySet': {
        const set = listSets(this.context).find((s) => s.name === m.name);
        if (!set) return;
        this.last = { comboId: set.comboId, profileId: set.profileId, variant: set.variant, overrides: set.overrides };
        await this.history.apply(() => applyTheme(set));   // apply the FROZEN colors, exactly as M5 did
        // …then regenerate purely to tell the panel what each role currently is
        const theme = generate(comboById(set.comboId), profileById(set.profileId), set.variant, set.overrides);
        this.post({
          type: 'restore',
          comboId: set.comboId, profileId: set.profileId, variant: set.variant,
          overrides: set.overrides || {},
          palette: theme.palette, tokens: theme.tokens, semantic: theme.semantic,
          contrast: Math.round(contrastRatio(theme.palette.text, theme.palette.bg) * 100) / 100,
        });
        break;
      }
      case 'delete':
        await deleteSet(this.context, m.name);
        this.post({ type: 'savedSets', savedSets: listSets(this.context).map((s) => s.name) });
        break;
      case 'export': {
        const doc = await vscode.workspace.openTextDocument({ language: 'json', content: exportSets(this.context) });
        await vscode.window.showTextDocument(doc);
        break;
      }
      case 'import': {
        const uris = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { JSON: ['json'] } });
        if (!uris?.length) return;
        const bytes = await vscode.workspace.fs.readFile(uris[0]);
        const count = await importSets(this.context, Buffer.from(bytes).toString('utf8'));
        void vscode.window.showInformationMessage(`Van Code: imported ${count} set(s).`);
        this.post({ type: 'savedSets', savedSets: listSets(this.context).map((s) => s.name) });
        break;
      }
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'styles.css'));
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Van Code</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
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
```

### `media/webview/styles.css`
```css
body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 8px; }
h4 { margin: 12px 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; opacity: .8; }
.section { margin-bottom: 8px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; }
.chip, .btn {
  font: inherit; cursor: pointer; border-radius: 4px; padding: 4px 8px;
  border: 1px solid var(--vscode-button-border, transparent);
  background: var(--vscode-button-secondaryBackground, #2a2d2e); color: var(--vscode-button-secondaryForeground, #ccc);
}
.chip.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
.chip:hover, .btn:hover { background: var(--vscode-button-hoverBackground); }
.text { width: 100%; box-sizing: border-box; padding: 4px 6px; margin-bottom: 6px;
  background: var(--vscode-input-background); color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, #3c3c3c); border-radius: 4px; }
.swatches { display: flex; gap: 4px; margin-bottom: 6px; }
.swatch { width: 22px; height: 22px; border-radius: 4px; border: 1px solid rgba(255,255,255,.15); }
.badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; }
.badge.ok { background: #1a7f37; color: #fff; }
.badge.warn { background: #9a6700; color: #fff; }
.badge.bad { background: #b62324; color: #fff; }
.muted { opacity: .6; }
/* --- M6: the per-role editor ------------------------------------------------ */
.roles { display: grid; grid-template-columns: 1fr auto auto auto; gap: 4px 6px; align-items: center; }
.role { font-size: 11px; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role.pinned { opacity: 1; font-weight: 600; }
input[type="color"] {
  width: 26px; height: 22px; padding: 0; cursor: pointer; background: none;
  border: 1px solid var(--vscode-input-border, #3c3c3c); border-radius: 4px;
}
.hex {
  width: 76px; box-sizing: border-box; padding: 2px 4px; font-size: 11px;
  font-family: var(--vscode-editor-font-family, monospace);
  background: var(--vscode-input-background); color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, #3c3c3c); border-radius: 4px;
}
.hex.invalid { border-color: #b62324; }
.clear {
  font: inherit; font-size: 12px; line-height: 1; cursor: pointer; padding: 2px 5px;
  border: none; border-radius: 4px; background: none; color: var(--vscode-foreground); opacity: .35;
}
.clear.on { opacity: 1; background: var(--vscode-button-secondaryBackground, #2a2d2e); }
details > summary {
  cursor: pointer; margin: 12px 0 6px; font-size: 11px;
  text-transform: uppercase; letter-spacing: .04em; opacity: .8;
}
```

### `media/webview/main.js`
```js
(function () {
  const vscode = acquireVsCodeApi();
  const app = document.getElementById('app');
  const state = {
    combos: [], profiles: [], savedSets: [],
    comboId: null, profileId: null, variant: null, languageId: '',
    overrides: { palette: {}, tokens: {}, semantic: {} },   // what you pinned — sparse
    effective: { palette: {}, tokens: {}, semantic: {} },   // what the theme is — from `applied`
  };

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'init') {
      state.combos = msg.combos;
      state.profiles = msg.profiles;
      state.savedSets = msg.savedSets || [];
      if (!state.comboId && state.combos[0]) state.comboId = state.combos[0].id;
      if (!state.profileId && state.profiles[0]) state.profileId = state.profiles[0].id;
      render();
      apply(); // apply the initial selection once, right after the first draw
    } else if (msg.type === 'applied') {
      state.effective = { palette: msg.palette, tokens: msg.tokens, semantic: msg.semantic };
      renderPreview(msg.palette, msg.contrast);
      renderRoles();
    } else if (msg.type === 'savedSets') {
      state.savedSets = msg.savedSets || [];
      renderSaved();
    } else if (msg.type === 'restore') {
      state.comboId = msg.comboId;
      state.profileId = msg.profileId;
      state.variant = msg.variant || null;
      state.overrides = { palette: {}, tokens: {}, semantic: {}, ...(msg.overrides || {}) };
      state.effective = { palette: msg.palette, tokens: msg.tokens, semantic: msg.semantic };
      render();                                    // redraw chips + rows against the restored state
      renderPreview(msg.palette, msg.contrast);    // render() leaves #preview empty; fill it
    }
  });

  function apply() {
    if (!state.comboId || !state.profileId) return;
    vscode.postMessage({
      type: 'apply', comboId: state.comboId, profileId: state.profileId,
      variant: state.variant || undefined, languageId: state.languageId || undefined,
      overrides: state.overrides,
    });
  }

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    Object.assign(n, props || {});
    for (const k of kids) n.append(k);
    return n;
  }
  function section(title, body) {
    return el('div', { className: 'section' }, el('h4', { textContent: title }), body);
  }

  function render() {
    app.innerHTML = '';

    const combosBox = el('div', { className: 'row' });
    for (const c of state.combos) {
      const b = el('button', { textContent: c.label, className: c.id === state.comboId ? 'chip active' : 'chip' });
      b.addEventListener('click', () => { state.comboId = c.id; render(); apply(); });
      combosBox.append(b);
    }
    app.append(section('Starter combination', combosBox));

    const profBox = el('div', { className: 'row' });
    for (const p of state.profiles) {
      const b = el('button', { textContent: p.label, className: p.id === state.profileId ? 'chip active' : 'chip' });
      b.addEventListener('click', () => { state.profileId = p.id; state.variant = null; render(); apply(); });
      profBox.append(b);
    }
    app.append(section('Style', profBox));

    const sel = state.profiles.find((p) => p.id === state.profileId);
    if (sel && sel.variants && sel.variants.length) {
      const vbox = el('div', { className: 'row' });
      for (const v of sel.variants) {
        const active = (state.variant || sel.variants[0]) === v;
        const b = el('button', { textContent: v, className: active ? 'chip active' : 'chip' });
        b.addEventListener('click', () => { state.variant = v; render(); apply(); });
        vbox.append(b);
      }
      app.append(section('Variant', vbox));
    }

    app.append(el('div', { id: 'preview', className: 'section' }));
    app.append(el('div', { id: 'roles', className: 'section' }));

    const lang = el('input', { id: 'lang', type: 'text', placeholder: 'languageId e.g. typescript (blank = all)', value: state.languageId, className: 'text' });
    lang.addEventListener('change', () => { state.languageId = lang.value.trim(); });
    app.append(section('Per-language (tokens only)', lang));

    const actions = el('div', { className: 'row' });
    const mk = (label, type) => { const b = el('button', { textContent: label, className: 'btn' }); b.addEventListener('click', () => vscode.postMessage({ type })); return b; };
    actions.append(mk('Revert', 'revert'), mk('Reset', 'reset'));
    const saveBtn = el('button', { textContent: 'Save set…', className: 'btn' });
    saveBtn.addEventListener('click', () => {
      const name = (document.getElementById('setname')).value.trim();
      if (name) vscode.postMessage({ type: 'save', name });
    });
    actions.append(mk('Export', 'export'), mk('Import', 'import'), saveBtn);
    const nameInput = el('input', { id: 'setname', type: 'text', placeholder: 'set name', className: 'text' });
    app.append(section('Actions', el('div', {}, nameInput, actions)));

    app.append(el('div', { id: 'saved', className: 'section' }));
    renderSaved();
    renderRoles();
  }

  function renderPreview(palette, contrast) {
    const box = document.getElementById('preview');
    if (!box) return;
    box.innerHTML = '';
    box.append(el('h4', { textContent: 'Palette' }));
    const strip = el('div', { className: 'swatches' });
    for (const key of ['bg', 'surface', 'surfaceAlt', 'text', 'textMuted', 'accent1', 'accent2', 'border']) {
      const sw = el('div', { className: 'swatch', title: key + ' ' + palette[key] });
      sw.style.background = palette[key];
      strip.append(sw);
    }
    box.append(strip);
    const aa = contrast >= 4.5, aaa = contrast >= 7;
    box.append(el('span', {
      className: 'badge ' + (aaa ? 'ok' : aa ? 'warn' : 'bad'),
      textContent: 'text/bg contrast ' + contrast + ':1 ' + (aaa ? 'AAA' : aa ? 'AA' : 'FAIL'),
    }));
  }

  function renderSaved() {
    const box = document.getElementById('saved');
    if (!box) return;
    box.innerHTML = '';
    box.append(el('h4', { textContent: 'My sets' }));
    if (!state.savedSets.length) { box.append(el('p', { className: 'muted', textContent: 'No saved sets yet.' })); return; }
    for (const name of state.savedSets) {
      const row = el('div', { className: 'row' });
      const apply = el('button', { textContent: name, className: 'chip' });
      apply.addEventListener('click', () => vscode.postMessage({ type: 'applySet', name }));
      const del = el('button', { textContent: '✕', className: 'chip' });
      del.addEventListener('click', () => vscode.postMessage({ type: 'delete', name }));
      row.append(apply, del);
      box.append(row);
    }
  }

  const GROUPS = [
    { key: 'palette',  title: 'Fine-tune — chrome roles' },
    { key: 'tokens',   title: 'Fine-tune — syntax token roles' },
    { key: 'semantic', title: 'Semantic token types', collapsed: true },
  ];

  function renderRoles() {
    const box = document.getElementById('roles');
    if (!box) return;
    box.innerHTML = '';
    for (const group of GROUPS) {
      const names = Object.keys(state.effective[group.key] || {});
      if (!names.length) continue;   // nothing applied yet — no colors to show
      const grid = el('div', { className: 'roles' });
      for (const name of names) grid.append(...roleRow(group.key, name));
      box.append(group.collapsed
        ? el('details', {}, el('summary', { textContent: group.title }), grid)
        : section(group.title, grid));
    }
    const pinned = countPinned();
    const footer = el('div', { className: 'row' });
    footer.append(el('span', {
      className: pinned ? 'badge warn' : 'badge muted',
      textContent: pinned + ' pinned',
    }));
    const clearAll = el('button', { className: 'btn', textContent: 'Clear all overrides', disabled: !pinned });
    clearAll.addEventListener('click', () => {
      state.overrides = { palette: {}, tokens: {}, semantic: {} };   // fresh groups, no leftover keys
      apply();
    });
    footer.append(clearAll);
    box.append(footer);
  }

  function countPinned() {
    return Object.keys(state.overrides)
      .reduce((total, group) => total + Object.keys(state.overrides[group]).length, 0);
  }

  function roleRow(group, name) {
    const pinned = state.overrides[group][name];
    const shown = pinned ?? state.effective[group][name];

    const label = el('span', { className: pinned ? 'role pinned' : 'role', textContent: name, title: name });

    // 'change' (picker dismissed), NOT 'input' (fires all through the drag) — one apply, one snapshot.
    const swatch = el('input', { type: 'color', value: shown });
    swatch.addEventListener('change', () => setRole(group, name, swatch.value));

    const hex = el('input', { type: 'text', className: 'hex', value: shown, spellcheck: false });
    hex.addEventListener('change', () => {
      const typed = hex.value.trim().toLowerCase();
      if (/^#[0-9a-f]{6}$/.test(typed)) setRole(group, name, typed);
      else { hex.classList.add('invalid'); hex.value = shown; }   // reject, keep the color, show why
    });

    const clear = el('button', {
      className: pinned ? 'clear on' : 'clear', textContent: '↺',
      title: pinned ? 'Back to the formula' : 'Not pinned',
    });
    clear.addEventListener('click', () => { delete state.overrides[group][name]; apply(); });

    return [label, swatch, hex, clear];
  }

  function setRole(group, name, hex) {
    state.overrides[group][name] = hex;
    apply();   // the redraw comes from the `applied` reply, not from here
  }

  vscode.postMessage({ type: 'ready' });
})();
```

## Troubleshooting sheet (M6 traps)
| Symptom | Usual cause | Fix |
|---------|-------------|-----|
| Editing a role does nothing | `apply()` doesn't send `overrides`, or the provider doesn't forward `m.overrides` | step 06 point 3 + step 04 point 4 — the field name must match on both sides |
| The editor recolors continuously while dragging; Revert needs many clicks | listeners wired to `input` | use `change` on both the swatch and the hex box (step 06) |
| Pinning `bg` changes only `editor.background` | the merge runs after `paletteToChrome` | `overrideRoles` must wrap `profile.buildPalette(...)` — merge ① (step 03) |
| An "empty" edit blanks a color / `undefined` reaches VS Code | merged with a spread instead of `overrideRoles` | filter by `isHex` first; see step 02's warning and its `undefined-safe` check |
| Badge stays at `3 pinned` after un-pinning everything | un-pin assigns `undefined` instead of `delete` | `Object.keys` still lists undefined-valued keys — use `delete` (step 08) |
| `Cannot read properties of undefined (reading '<role>')` | a group key missing from `state.overrides` | it must always hold all three: `{ palette: {}, tokens: {}, semantic: {} }` |
| Fine-tune section is empty | no apply has happened, or `applied` isn't carrying `tokens`/`semantic` | pick any style chip; then check step 04 point 4 |
| Rows render as a ragged column | wrapper missing `className: 'roles'`, or the CSS block wasn't appended | step 05 — and the grid must get 4 cells per row, not a wrapper |
| A style chip "doesn't work" for one color | that role is pinned — working as designed | read the `N pinned` badge; ↺ the row or Clear all |
| Clicking a swatch opens no picker at all | your VS Code build doesn't surface the OS color dialog inside the sandboxed webview | not fatal — the **hex box beside it is the full-strength control** and every check here passes through it. See step 05's note |
| Semantic pin does nothing | no language server on the open file | test on `.ts`; M5's documented semantic trap |
| Restored set shows empty pickers | webview isn't handling `restore`, or the set predates step 09 | step 09 point 8; re-save the set |
| Clicking a saved set needs two Reverts | `apply()` called after `render()` in the `restore` branch | the provider already applied — don't apply again (step 09) |

## Next
Every color in the editor is now either computed for you or chosen by you, and either way it's revertible, saveable
and shareable. What's left is to stop needing <kbd>F5</kbd>.

**[M7 — Packaging](../MILESTONE_7_packaging/00_overview.md)** adds the one manifest field `vsce` requires, builds
**`van-code-0.0.1.vsix`**, and installs it into an ordinary window — which is also where the status-bar exception
open since M3 finally closes.

---
> Nav: [← Saved sets remember overrides](09_persist-overrides.md) · [Overview](00_overview.md) · [M7 → Packaging](../MILESTONE_7_packaging/00_overview.md)
