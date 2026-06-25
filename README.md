<p align="center">
  <img src="assets/go-lean-sdd.webp" alt="Go Lean SDD" width="480">
</p>

<h1 align="center">Go Lean SDD</h1>

<p align="center"><strong>The leanest path that still ships tested code.</strong></p>

<p align="center">A spec-driven development framework for AI coding agents, packaged as a Claude Code skill.</p>

<p align="center">
  <img alt="License: CC BY 4.0" src="https://img.shields.io/badge/License-CC%20BY%204.0-blue.svg">
  <img alt="Type: Claude Code skill" src="https://img.shields.io/badge/Claude%20Code-skill-black.svg">
</p>

---

Go Lean SDD turns a request or PRD into working, tested code. It sizes the process to the task instead of forcing the same ceremony on every change: a one-line fix gets one line of spec; a multi-component feature earns a full spec, design, and task breakdown.

## Why it exists

Spec-driven frameworks tend to grow heavy — directory trees, status files, multi-step rituals, token-hungry templates — applied whether you are fixing a typo or building a subsystem.

In a benchmark of four popular SDD frameworks, a strong model given nothing but a good `AGENTS.md` scored **0.89** — on par with the best framework, at lower token cost. The takeaway: a capable model does not need scaffolding. It needs tight instructions. So this is instructions, not scaffolding.

## What it does

- **Sizes planning to the task.** Depth is earned by complexity, never applied by default. Trivial and medium work stays inline; only a large feature produces written artifacts.
- **Enforces tests that catch regressions.** Every change ships with co-located tests. A discrimination check then mutates the new code to confirm a test actually fails — so you get tests that bite, not tests that pass by construction.
- **Keeps the repo clean.** No directory trees, no empty scaffolding, no status files that go stale. Durable context lives in one `AGENTS.md`.
- **Builds on what already exists.** Before writing new code, it climbs a reuse ladder — your project, your dependencies, the standard library, the framework, the platform — and writes new code only when nothing above fits.

## Install

```sh
git clone https://github.com/enzodevs/go-lean-sdd.git ~/.claude/skills/go-lean-sdd
```

Restart your session. The skill surfaces as `/go-lean-sdd` and activates on its own when you plan, design, implement, test, or verify.

## How it works

Four phases, applied only as deep as the task earns:

| Scope | Specify | Design | Tasks | Execute |
|---|---|---|---|---|
| **Trivial** — ≤3 files, one sentence | 1 line inline | — | — | implement + test |
| **Medium** — clear feature, <10 steps | brief + edge cases | inline | implicit | implement + test per step |
| **Large** — multi-component / ambiguous | full + requirement IDs | approach + reuse | atomic breakdown | implement + test + verify per task |

Specify and Execute are always on. Design and Tasks switch on only when complexity demands them. The full skill is in [`SKILL.md`](SKILL.md); deeper guidance loads on demand from [`references/`](references/).

## What makes it different

One core file of instructions, not a framework of templates. Depth is earned, not defaulted. Tests are the gate — nothing is done until real, discriminating tests pass. Nothing is written to disk unless it will actually be reused.

## Credits

Distilled from a public benchmark of spec-driven-development frameworks (benchmark by Waldemar Neto) and the ideas worth keeping from each one studied — auto-sizing and test enforcement, strict scope adherence and delta framing, gray-area surfacing and interface contracts, clarification and parallel markers, and the reuse-first build ladder. The synthesis, and what was deliberately left out, is the point.

The logo features a Go gopher — the mascot created by [Renée French](https://reneefrench.blogspot.com/), licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## License

[Creative Commons Attribution 4.0 International](LICENSE) (CC BY 4.0). Use it, adapt it, build on it — commercial use included. Just credit "Go Lean SDD by rrghost" and link the license.
