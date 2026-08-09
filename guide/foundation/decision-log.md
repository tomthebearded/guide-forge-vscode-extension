# Decision log — Van Code (VS Code extension)

> Why the guide is the way it is. Each entry: the decision, the reasoning, and what it rules out.
> Seeded from the plan's Phase 0 interview and Phase 0.5 web check; append-only (supersede, don't delete).

## D1 — Non-destructive backbone is load-bearing
- **Date:** 2026-07-10
- **Source:** hard constraint from the idea brief + Phase 0 risk advise-back.
- **Decision:** Every apply snapshots the prior color settings *before* writing. A Revert history steps back
  through snapshots; Reset removes all customizations entirely. Introduced *small* in M2 (one workbench color)
  before any generation exists.
- **Why:** the extension writes to the user's **real** `settings.json` (during F5 dev, your own editor). Without
  an airtight snapshot/revert story, a bad palette is a destructive edit to the reader's environment.
- **Rules out / trade-off:** a "just apply, no history" shortcut; history costs a little state and one write path.
- **Revisit if:** VS Code ever exposes a first-class transactional theme-preview API that supersedes manual snapshots.

## D2 — Per-language scoping is tokens-only
- **Date:** 2026-07-10
- **Source:** Phase 0.5 web check (VS Code settings + language-override docs).
- **Decision:** Per-language scoping (feature 9) applies to `editor.tokenColorCustomizations` and
  `editor.semanticTokenColorCustomizations` only; workbench chrome stays global. The guide teaches *why*.
- **Why:** `workbench.colorCustomizations` is a workbench setting, **not** language-overridable via the
  `"[languageId]"` syntax — a hard API limit, not a choice. Hiding it would make M5 promise something VS Code
  won't do.
- **Rules out / trade-off:** per-language chrome recoloring. Considered and rejected: reframing as per-*workspace*
  theming (chrome can vary per workspace) — a different feature, noted as a possible extension.
- **Revisit if:** VS Code makes workbench colors language-scopable.

## D3 — Two-layer architecture: pure engine + thin adapter
- **Date:** 2026-07-10
- **Source:** conventions decision (audience: color math = Beginner, VS Code API = New).
- **Decision:** Color math + the 13 profiles live in a `vscode`-free `src/engine/`; all API/side-effect code lives
  in the adapter (`extension.ts`, `panel/`, `theme/`). One `theme/` module is the sole settings write path.
- **Why:** lets the reader unit-test the hardest-to-eyeball part (the color formulas) in plain Node without F5,
  and keeps the "non-destructive" guarantee enforceable at one choke point.
- **Rules out / trade-off:** a quicker all-in-`extension.ts` build; costs a little upfront structure.
- **Revisit if:** the engine ever needs VS Code APIs (it shouldn't — colors are strings in, strings out).

## D4 — All 13 styles taught in full (data-driven)
- **Date:** 2026-07-10
- **Source:** Phase 0 interview (reader chose "all 13 in full" over a taught-subset).
- **Decision:** Every one of the 13 styles gets a worked section. Sprawl is bounded structurally: one shared
  engine, 9 seed-driven generative profiles + 4 fixed-identity signature presets, each a short patterned data
  entry in one registry; grouped into sittings across M3/M4.
- **Why:** the reader explicitly wanted full coverage; the data-driven registry keeps the repetition bounded and
  each profile short rather than an essay.
- **Rules out / trade-off:** the tighter "teach 3–4, ship the rest as data" option; costs more length in M3/M4.
- **Revisit if:** the guide proves too long in practice — collapse the least-instructive profiles to data-only.

## D5 — Pin TypeScript 5.9.x, not 7.0
- **Date:** 2026-07-10
- **Source:** Phase 0.5 web check.
- **Decision:** Pin TypeScript `^5.9.0`.
- **Why:** TS 7.0 (the native compiler) shipped 2026-07-08 — 2 days before the check. Bleeding-edge for a
  beginner-audience guide; 5.9.x is mature and what a fresh `yo code` scaffold most likely still resolves.
- **Rules out / trade-off:** 7.0's ~10× faster builds; not worth the risk here.
- **Revisit if:** a future `/update-stack` run and 7.x has settled into the default scaffold.

## D6 — Pin VS Code engine to current stable (`^1.128.0`)
- **Date:** 2026-07-10
- **Source:** Phase 0.5 web check + acknowledged risk.
- **Decision:** Pin `engines.vscode` and `@types/vscode` to `^1.128.0`.
- **Why:** one consistent teaching target across all milestones. The Webview-View + color APIs have been stable
  since 1.49, so this is a teaching choice, not an API requirement.
- **Rules out / trade-off:** wider install reach — a reader on an older VS Code can lower the floor to `^1.100.0`
  safely (noted so they know it's optional).
- **Revisit if:** the guide targets Marketplace reach (out of scope here) — then lower the floor deliberately.

## D7 — M2's demo sets the status-bar debugging colors; the M3 engine map does not
- **Date:** 2026-08-07
- **Source:** field report (a reader following M2/05 saw the crimson only after stopping the debug session) +
  [Theme Color reference](https://code.visualstudio.com/api/references/theme-color#status-bar-colors), re-verified
  2026-08-07.
- **Decision:** M2's `applyDemo` writes **four** keys — `statusBar.background`/`foreground` **and**
  `statusBar.debuggingBackground`/`debuggingForeground` — so the milestone's one observable proof is visible in the
  Extension Development Host. M3's `paletteToChrome` stays at **20 keys** and deliberately omits the debugging pair;
  from M3 on the guide *teaches the exception* instead (the status bar keeps the debug-orange under <kbd>F5</kbd>,
  proven via the `settings.json` diff, and recolors normally once the extension is installed from the `.vsix`).
- **Why:** M2 exists to prove "the write lands and you can see it" — a demo you can't see fails its own gate, and the
  fix is two lines. M3's 20-key count is asserted by a machine-checked `node -e` gate and repeated across M3/M5
  gates; growing it to 22 to work around a *dev-loop artifact* would ripple through ~10 assertion sites and bake an
  F5 concern into a pure engine that is supposed to be about color math. Teaching the precedence rule once (M2/05)
  and referring back to it costs nothing and explains something real about VS Code.
- **Rules out / trade-off:** a status bar that is themed under F5 from M3 onward. The reader watching the EDH sees
  every surface but that one recolor — acceptable only because the guide now says so explicitly at every gate that
  used to claim otherwise, and closes the loop in [M7/02](../MILESTONE_7_packaging/02_verify.md) — where the
  packaged `.vsix`, installed in an ordinary (undebugged) window, finally paints the bar with everything else.
- **Revisit if:** the engine gains a "chrome extras" pass, or a reader still misreads the M3 status bar as a bug —
  then add the two keys to `paletteToChrome` (→ 22) and update every key-count assertion in M3/00, M3/06, M3/08,
  M6/10 **and** the `generate.ts` file copies in M3/08, M5/09 and M6/10, in the same pass.

## D8 — Engine code spells its locals out; the terse math names are gone
- **Date:** 2026-08-08
- **Source:** reader feedback while following M3 (`src/engine/color.ts` read as unfollowable: `c`, `d`, `n`, `x`,
  `m`, `t`, `la`/`lb`, `hi`/`lo`, `to2`, `rn`/`gn`/`bn`) + the reader's own rewrite of the file.
- **Decision:** every `src/engine/*` code block in the guide uses spelled-out locals — `palette`, `combo`,
  `profile`, `chroma`, `brightest`/`darkest`, `luminanceA`/`luminanceB`, `brighter`/`darker`, `toHexPair`,
  `fromHex`/`toHex`/`amount`, `foreground`/`background`/`targetRatio`, `hsl`, `step`. Two formula intermediates
  that the math has no word for are now *named after their meaning*: `maxChromaAtThisLightness` (was the inline
  `l > 0.5 ? 2-max-min : max+min`) and `lightnessOffset` (was `m`). `hslToHex`'s six-branch `if (h < 60) … else`
  ladder became `switch (Math.floor(hue / 60))`, one labelled case per 60° slice. Codified as a naming rule in
  [conventions.md](conventions.md#naming); the three surviving abbreviations are the `Rgb`/`Hsl` interface fields,
  the `Palette` role names, and underscore-prefixed unused parameters (`_combo`).
- **Why:** a reader typing this code for the first time has no IDE hover and no prior model of the algorithm — the
  variable name is the cheapest explanation a step can give, and `d`/`x`/`m` spend that budget on nothing. The
  engine is also the guide's most math-dense milestone, so it is exactly where terseness costs the most.
- **Rules out / trade-off:** longer lines and a slightly taller code block per step (M3/01 grew ~40 lines,
  comments included). Accepted: the guide optimizes for a first read, not for a diff.
- **Verified:** behavior-preserving — the renamed engine compiles under `--strict` and its output is byte-identical
  to the pre-rename engine across all 85 combo × profile(× variant) themes and a 17,760-color sweep of all 13
  color operations. Every published gate value is unchanged (`#3ec6ff` round-trip, contrast `21`, 20 chrome keys,
  Midnight `#000000`, 13 profiles, 13 semantic types, Game Boy `#0f380f`).
- **Revisit if:** a later milestone adds engine code — it must follow the conventions.md rule, not the old style.

## D9 — Overrides are role-level, not VS Code-key-level
- **Date:** 2026-08-09
- **Source:** feature request — "the reader must be able to choose every customizable color" — scoped against the
  plan's existing "no settings-JSON editor UI" boundary.
- **Decision:** M6's per-color editing exposes the **28 roles the engine emits** — the 8 `Palette` roles, the 7
  `TokenColors` roles and the 13 semantic token types — and **not** the ~600 keys of VS Code's theme-color
  reference, nor even the 20 `workbench.colorCustomizations` keys `paletteToChrome` writes. An override on `bg`
  re-derives every chrome key computed from `bg`.
- **Why:** a role is the unit the reader actually thinks in ("make the background darker"), and the 20 chrome keys
  are already a *coordinated* function of the 8 roles — exposing them individually would let a reader desynchronize
  surfaces the formula spent M3 harmonizing, for more clicks, not fewer. It also keeps the feature inside the plan's
  scope boundary: a searchable editor over VS Code's full key list *is* the settings-JSON editor UI the plan rules
  out. Mechanically it costs one merge point instead of one per key.
- **Rules out / trade-off:** pinning a single workbench surface (e.g. only `tab.inactiveBackground`) without moving
  its siblings. Accepted: that's a theme-authoring task, not a palette-tuning one, and `settings.json` already does
  it. The 20-key map stays exactly the size D7 fixed — M6 changes values in it, never its shape.
- **Revisit if:** readers repeatedly want one workbench surface pinned independently — then add a **fourth**
  override group keyed by VS Code color key, merged after `paletteToChrome`, which the `overrideRoles` generic
  already supports without modification.

## D10 — Role edits commit on `change`, not on `input`
- **Date:** 2026-08-09
- **Source:** the M2 non-destructive backbone (D1) meeting a native color picker; same failure class as the
  2026-07-13 double-apply bug.
- **Decision:** both controls in a role row — `<input type="color">` and the hex text box — apply on the **`change`**
  event (picker dismissed / field left), never on `input`.
- **Why:** every apply passes through `history.apply(...)`, which takes a settings snapshot. `input` fires
  continuously while the user drags a hue slider, so one gesture would push hundreds of snapshots and the first
  **Revert** would appear inert — the exact symptom a reader already reported once for a different cause. The rule
  the guide has enforced since M4 is *one deliberate action → one apply → one snapshot*, and `change` is what keeps
  it true here.
- **Rules out / trade-off:** live preview while dragging. Considered and rejected: a debounced `input` (still
  multiple snapshots per gesture, plus a timer to explain) and a preview-without-snapshot path (a second write path
  — straight through D1's one-choke-point rule). Accepted cost: the editor updates on release rather than during
  the drag, which the M6 gate states as expected behaviour so it doesn't read as lag.
- **Revisit if:** the history gains an explicit "coalesce until idle" mode — then a debounced `input` becomes
  cheap, and only then.
