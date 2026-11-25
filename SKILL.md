---
name: go-lean-sdd
description: Spec-driven delivery sized to the task, with scope, acceptance criteria and discriminating tests. Use to turn a feature request or PRD into tested code when the change touches 3+ files, crosses modules or needs decisions. Not for one-file edits, simple bug fixes, diagnosis, review or status checks.
license: CC-BY-4.0
metadata:
  author: rrghost
  version: 0.3.0
---

# Go Lean SDD

One rule above all: **the leanest path that still ships tested, in-scope code.**
Instructions, not scaffolding: one spec file when the work earns it, nothing else.

## 1. Decide depth first (auto-size)

| Scope | Specify | Design | Tasks | Execute |
|---|---|---|---|---|
| **Trivial** — 1–2 files, or a fix with a failing test | 1 line inline | — | — | implement + test |
| **Medium** — 3+ files inside one module | spec file, brief | inline | implicit | implement + test per step |
| **Large** — crosses modules, changes schema or public API, or has open decisions | spec file, full | approach | vertical slices | implement + test + verify per slice |

- Specify and Execute always run. When unsure, start smaller; escalate when Execute reveals another module, a schema/API change or an open decision.

## 2. Scope discipline (don't bloat)

- **Investigate before you build.** New code is the last resort: climb the reuse ladder (this project, its dependencies, stdlib, framework, platform, a mature external system for non-core domains) and stop at the first rung that holds — [references/architecture.md](references/architecture.md).
- **Run the canonical operation; don't handcraft its output.** Prefer the ecosystem's supported initializer, generator, migration, formatter, package-manager, or platform command. Use safe non-interactive flags when possible; if it genuinely requires user choices, credentials, browser authorization, or an unavailable TTY, guide the user through running it in another terminal and continue from the resulting files.
- **Lazy about the solution, never about diligence:** staying lean never justifies cutting input validation, error/data-loss handling, security, accessibility or the system's invariants. Lean means less code, not weaker guarantees. Those are always in scope.
- **Name the boundary:** **in** scope, **out** of scope, and what must stay **unchanged** — one line each. Each risky "unchanged" gets a regression test.
- **Decompose first:** if the request spans 2+ independent subsystems, split it and confirm the split before speccing.
- **Brownfield = deltas:** describe what *changes* (added / modified / removed), not the whole existing system.

## 3. The phases

**SPECIFY — pin down WHAT.**
- State the request and its reason in 1–2 sentences. Acceptance criteria get stable ids (A1, A2…): **Given / When / Then** for flows, a table of inputs → expected outputs when a rule has many cases.
- **Clarify by interview (default for Medium/Large).** Map the open decisions as a design tree: each decision branches into the ones that depend on it.
  - Facts are yours, decisions are the user's: look up anything the code, docs or tools can answer before asking.
  - First question: does the whole request justify itself, or can part of it not be built?
  - Ask the **frontier** (decisions whose prerequisites are settled) in rounds — one question at a time if the user prefers. Number each question, give your recommended answer and its consequence, and word it so "yes" accepts the recommendation. Use the structured user-question interface when available.
  - Each answer reshapes the tree; recompute the frontier. A question that depends on another open one waits for a later round.
  - Done when every branch is visited and nothing is silently assumed. Summarize the shared understanding, get the user's confirmation, then write the decisions into the spec. No code during the interview.
- **Fast mode** (the user says "fast", "you decide" or similar): ask only product decisions. Take technical decisions yourself, grounded in the project's stack and official docs or primary sources, and record each in the spec with its source.

**DESIGN — pin down HOW (Large only).**
- **Default shape:** a well-modularised monolith / monorepo, not premature microservices — clear module boundaries and explicit interfaces.
- **Invariants first.** List what must never happen — from the request, and by asking "if this ran a year with real users, what would break?". For each, research and weigh two ways to guarantee it, and pick the strongest one the stack enforces by itself (a constraint, a transaction, a type, a framework scope) over a check the code must remember. Record each in Decisions with its source.
- Note the approach, key components and any new pattern — only what informs the build. Add a Mermaid diagram when a flow crosses 3+ components — [references/diagrams.md](references/diagrams.md).

**TASKS — vertical slices (Large only).**
Each task is a slice that is verifiable on its own: `What · Where · Done-when · Test`, plus `Depends on:` when it has to wait. For a task others build on, add `Produces:` (exact signatures). A task is wrong if its **Done-when** isn't observable; tasks longer than the spec are code in disguise.

**EXECUTE — build it, prove it.**
- List the concrete steps inline *before* editing. Make the smallest correct change; match the surrounding conventions.
- Mark a knowing shortcut with a code comment `shortcut: <the limit>, <when to upgrade>`.
- Commit atomically: one logical change per commit, working tree green.
- Tests are part of "done," not a follow-up — see §4. A user-visible change is exercised once in the real interface (browser, CLI, device) before "done"; diff review does not catch UI defects.
- Large work gets one independent review of the diff against the spec (a reviewer agent or a clean-context re-read), then one round of fixes. Anything left is listed in the spec.

## 4. Test discipline (non-negotiable)

The heart of this skill: real, *discriminating* tests. What separates solid work from plausible-looking output is whether the tests would actually catch a regression.

- Define the verification **before** Execute finishes — each acceptance criterion maps to a test.
- Test at the right level: unit for logic, integration/e2e for user-visible behavior.
- **Co-location:** the test ships in the same task that writes the code — never deferred, never "covered elsewhere."
- **Gate:** nothing is "done" until its tests exist and pass. Run them and report results (counts, pass/fail). Cite `file:line` for each acceptance criterion — an AC with no citation counts as *not covered*.
- **Discrimination check (the part most skip):** after tests pass, prove the tests bite. For high-risk logic, start with the invariant guards: mutate 1–2 spots in the new code — flip a condition, change a return, drop an edge case — and confirm a test fails. For low-risk glue, a targeted regression check plus reviewer pass can stand in.
- Never use skip / disable / pending / `.only` to make a suite look green.
- If something genuinely can't be tested, say so explicitly and explain why — never silently ship unverified code.
- **Depth** — spec-derived tests & the test-after overfit trap, anti-patterns, level selection, the discrimination procedure, tooling: [references/testing.md](references/testing.md).

## 5. Knowledge & honesty

Verify, don't assume: existing code → project docs → official library docs → web. Use what is installed and what the project's `AGENTS.md` names: semantic code search and code maps (e.g. `cc2`, `xray`) for the existing system, current library docs (e.g. `ctx7`), and live web research for primary sources and alternatives (e.g. `exa-search`, or the harness's web search). A decision taken without a source says so in the spec. Never fabricate APIs, flags, or behavior; "I couldn't verify X" beats a confident guess.

## 6. The spec and durable context

- **One file per Medium/Large change:** `golean/specs/<NNN-slug>/spec.md`. Title, a `Status: **draft|in-progress|closed**` line with the next step, then: Request · Scope (in / out / unchanged) · Decisions (with source) · Acceptance · Tasks · Delivery. A project may write the headings in its own language.
- **State, not history.** A delivered task becomes one line with its commit; long receipts go in the commit or an optional `verification.md`. Target ~10 KB; above ~20 KB compress or split. The size is a warning, never a block.
- **Closing:** code on the main branch closes the spec; it moves to `golean/archive/` with links repointed. What remains (activation, acceptance) goes to the project's roadmap.
- **Operate specs with the bundled script** instead of by hand — `bun <this skill's dir>/scripts/golean.ts`:
  `new "<title>" [--lang pt]` · `status <id> [draft|in-progress]` · `check [id]` · `close <id>` · `list [--all]`; `--json` for machine output, `--dir` for a non-default folder.
- **`AGENTS.md`** (repo root) is the source of truth for conventions, build/run/test commands and platform choices; scoped `AGENTS.md` files in subtrees carry directory rules. Keep it current. Cross-project facts go to global memory, not the repo.
