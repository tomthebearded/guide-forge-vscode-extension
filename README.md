# guide-forge-vscode-extension

**A sample guide produced with [GuideForge](https://github.com/tomthebearded/guide-forge) `v1.2.0` — plus the
VS Code extension it builds.**

This repository exists as a worked example: it shows what a *learn-as-you-go* build guide looks like when it
comes out of the GuideForge toolkit end to end (plan → scaffold → draft → audit), and what the reader ends up
with if they follow it. Unlike the [web-platformer example](https://github.com/tomthebearded/guide-forge-web-platformer),
this guide is also being **executed** — so it exercises the maintenance half of the toolkit too
(mark-progress → report-issue → amend-guide), and the record of that is kept in the open, defects included.

> **Built with GuideForge v1.2.0**, the pedagogy contract this guide was stamped against; it was planned and
> drafted from **2026-07-10** and has been maintained with every later release since, most recently
> **v1.16.0** on **2026-08-17** — see the session log in
> [`guide/foundation/status.md`](guide/foundation/status.md). The toolkit has moved on since; a guide
> generated with a newer GuideForge will differ in structure and conventions.

The subject is **Van Code**, a TypeScript VS Code extension with a sidebar panel in the Activity Bar that
generates and instantly applies a full editor color theme — workbench chrome *and* syntax/semantic tokens —
from a *starter color combination* plus a *visual style preset*. 5 combos × 13 styles (× variants) = **85
themes**, each one **28 hand-editable roles** (8 chrome, 7 syntax, 13 semantic). Every apply is **live** (no
reload) and **non-destructive**: a snapshot is taken before every write, Revert steps back, Reset removes
everything. The finish line is a packaged **`.vsix`**.

---

## What's in here

| Path | What it is |
|------|------------|
| **[`guide/`](guide/)** | The guide itself — the actual artifact this repo is an example of. 7 milestones, 50 atomic teaching steps (verify gates included), plus the GuideForge foundation docs (`stack`, `status`, `progress`, `glossary`, `conventions`, `decision-log`, `audience`) and a feedback log. Start at [`guide/README.md`](guide/README.md). |
| **[`van-code/`](van-code/)** | The extension as actually built by following the guide. **It is mid-guide, not finished** — the frontier is M6/04 (see [`guide/foundation/progress.md`](guide/foundation/progress.md)), so per-role editing and packaging aren't in it yet. |
| [`guide/PLAN.md`](guide/PLAN.md) | The stage-1 plan the whole guide was drafted from (audience model, milestone ladder, scope boundaries). |

---

## Run the extension

You need **Node 24 LTS** and VS Code (the project declares `engines.vscode: ^1.125.0`).

1. Clone this repository.
2. `cd van-code && npm install` — `out/` and `node_modules/` aren't committed; <kbd>F5</kbd> compiles for you.
3. Open the **`van-code/`** folder in VS Code (not the repo root) and press <kbd>F5</kbd>. A second window
   opens — the Extension Development Host.
4. In that window, click the **Van Code** icon in the Activity Bar.

**The panel**

| Control | Action |
|---------|--------|
| Starter combo | Pick one of 5 base color combinations |
| Style preset | Pick one of 13 visual styles (neon, pastel, midnight, game-boy, synthwave, …) — picking either one applies immediately |
| Contrast badge | Grades the generated theme against WCAG |
| **Revert** | Step back one snapshot |
| **Reset** | Remove every customization the extension wrote |
| **Save** / saved sets | Store the current theme by name (kept in the extension's `globalState`) and re-apply it later |
| **Export** / **Import** | Round-trip a saved set as JSON |

> **It writes to your real `settings.json`.** That is the point of the exercise — and the reason the snapshot
> backbone exists. **Reset** removes everything it added. Two known quirks in this state: the Extension
> Development Host paints its status bar from the *debugging* colors, so that one surface won't recolor under
> <kbd>F5</kbd> (it does once installed), and per-language token scoping throws — it is repaired in Milestone 6.

---

## Follow the guide instead

If you'd rather build it yourself — which is the point of the guide:

1. Read [`guide/foundation/status.md`](guide/foundation/status.md) first: it's the single source of truth for
   what's drafted and what's verified, and it names the guide's open defects.
2. Start at [Milestone 1](guide/MILESTONE_1_scaffold-sidebar/00_overview.md) and do the milestones in order.
3. **Type the code, don't paste it.** The complete files are included so you have something authoritative to
   diff against, not so you can paste blindly.
4. Use [`van-code/`](van-code/) as the reference implementation when you get stuck — remembering it only goes
   as far as the guide has been executed (M6 step 03).

The guide assumes you can read code but not that you know the VS Code extension API — every API, manifest key
and color concept is defined on first use.

> **Verification status:** M1–M4 were executed and their Done-when gates passed by hand under <kbd>F5</kbd>.
> M5 is ⏳ — every check passed but per-language scoping, which the API rejects; M6 carries the repair. M6 is
> executed through step 03; M6/04 opens with a *Before you continue — corrections* section holding a
> readability fix for the M3–M5 color engine, which those milestones still teach unrepaired by
> [a deliberate decision](guide/foundation/decision-log.md). M7 (packaging) is drafted but not run. See
> [`guide/foundation/status.md`](guide/foundation/status.md) and
> [`guide/foundation/progress.md`](guide/foundation/progress.md).

---

## License

[MIT](LICENSE) © Tommaso Mastroberardino
