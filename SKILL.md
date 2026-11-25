---
name: go-lean-sdd
description: Spec-driven delivery sized to the task, with scope, acceptance criteria and discriminating tests. Use to turn a feature request or PRD into tested code when the change touches 3+ files, crosses modules or needs decisions. Not for one-file edits, simple bug fixes, diagnosis, review or status checks.
license: CC-BY-4.0
metadata:
  author: rrghost
  version: 0.1.0
---

# Go Lean SDD

One rule above all: **the leanest path that still ships tested, in-scope code.**
Instructions, not scaffolding. No directory trees, no ceremony — just enough process to stay correct.

## 1. Decide depth first (auto-size)

Assess scope before doing anything, then apply only what the size needs. Depth is *earned* by complexity, never applied by default.

| Scope | Specify | Design | Tasks | Execute |
|---|---|---|---|---|
| **Trivial** — ≤3 files, one sentence | 1 line inline | — | — | implement + test |
| **Medium** — clear feature, <10 steps | brief + edge cases | inline | implicit | implement + test per step |
| **Large** — multi-component / ambiguous | full + requirement IDs | approach + reuse | atomic breakdown | implement + test + verify per task |

- **Specify and Execute are always required.** Design and Tasks are skipped unless complexity demands them.
- When unsure of size, start smaller. Escalate only if Execute reveals >5 steps or hidden dependencies — then stop and write Tasks.

## 2. Scope discipline (don't bloat)

- **Investigate before you build.** New code is the last resort: climb the reuse ladder (this project, its dependencies, stdlib, framework, platform, a mature external system for non-core domains) and stop at the first rung that holds — [references/architecture.md](references/architecture.md).
- **Run the canonical operation; don't handcraft its output.** Prefer the ecosystem's supported initializer, generator, migration, formatter, package-manager, or platform command. Use safe non-interactive flags when possible; if it genuinely requires user choices, credentials, browser authorization, or an unavailable TTY, guide the user through running it in another terminal and continue from the resulting files.
- **Lazy about the solution, never about diligence:** staying lean never justifies cutting input validation, error/data-loss handling, security, or accessibility. Those are always in scope.
- **Name the boundary:** state what's **in scope** and **out of scope** before building — one line each. Naming the edge prevents scope creep better than any process gate.
- **Decompose first:** if the request spans 2+ independent subsystems, split it and confirm the split before speccing — don't design a tangle.
- **Brownfield = deltas:** describe what *changes* (added / modified / removed), not the whole existing system. Don't re-document working code.
- Prefer inline reasoning over files. Write a doc **only** when the artifact will actually be reused (a real spec for a Large feature). Never emit a tree of empty scaffolding.

## 3. The phases

**SPECIFY — pin down WHAT.**
- State the requirement in 1–2 sentences. Write acceptance criteria as **Given / When / Then** scenarios — they read as tests, which primes verifiable behavior over implementation detail.
- Surface gray areas: list assumptions and ambiguities, tagging real unknowns `[NEEDS CLARIFICATION]`. Skip the checkpoint below when no material ambiguity exists.
- **Clarify by interview (Medium/Large with material decisions, or when the user asks to be grilled).** Map the open decisions as a design tree: each decision branches into the ones that depend on it.
  - Facts are yours, decisions are the user's: look up anything the code, docs or tools can answer before asking.
  - Ask the **frontier** (decisions whose prerequisites are settled) in rounds — one question at a time if the user prefers. Number each question, give your recommended answer and its consequence, and word it so "yes" accepts the recommendation. Use the structured user-question interface when available.
  - Each answer reshapes the tree; recompute the frontier. A question that depends on another open one waits for a later round.
  - Done when every branch is visited and nothing is silently assumed. Summarize the shared understanding, get the user's confirmation, then write the decisions into the spec and remove resolved tags. No code during the interview.

**DESIGN — pin down HOW (Large only).**
- **Default shape:** a well-modularised monolith / monorepo, not premature microservices — clear module boundaries and explicit interfaces, without the operational sprawl.
- **Diagram it:** inline a Mermaid block for architecture and key flows — good diagrams aid *your* understanding, not just the model's. Keep them readable — see [references/diagrams.md](references/diagrams.md).
- Note the approach, key components, and any new pattern introduced — only what informs the build. For non-trivial architecture (the reuse ladder, platform choices, module boundaries), see [references/architecture.md](references/architecture.md).

**TASKS — atomic, verifiable units (Large only).**
Each task: `What · Where · Done-when · Test`. For a task others depend on, add `Produces:` (exact function/type signatures) so downstream tasks build against it without re-reading the spec. Mark `[P]` if parallelizable. A task is wrong if its **Done-when** isn't observable.

**EXECUTE — build it, prove it.**
- List the concrete steps inline *before* editing. >5 steps or tangled dependencies → stop and formalize as Tasks.
- Make the smallest correct change. Match the surrounding code's conventions.
- Mark any knowing shortcut with a `DEFER:` comment naming the ceiling **and** the upgrade path — so the next change knows it's a deliberate limit, not an accident.
- Commit atomically: one logical change per commit, working tree green.
- Tests are part of "done," not a follow-up — see §4.
- For Large work, get a fresh perspective on the diff against the spec before calling it done (a reviewer agent or a clean-context re-read), and iterate until no high-severity issues remain. An independent pass catches what self-review and passing tests miss.

## 4. Test discipline (non-negotiable)

The heart of this skill: real, *discriminating* tests. What separates solid work from plausible-looking output is whether the tests would actually catch a regression.

- Define the verification **before** Execute finishes — each Given/When/Then scenario maps to a test.
- Test at the right level: unit for logic, integration/e2e for user-visible behavior.
- **Co-location:** the test ships in the same task that writes the code — never deferred, never "covered elsewhere."
- **Gate:** nothing is "done" until its tests exist and pass. Run them and report results (counts, pass/fail). Cite `file:line` for each acceptance criterion — an AC with no citation counts as *not covered*.
- **Discrimination check (the part most skip):** after tests pass, prove the tests bite. For high-risk logic, mutate 1–2 spots in the new code — flip a condition, change a return, drop an edge case — and confirm a test fails. For low-risk glue, a targeted regression check plus reviewer pass can stand in. Tests must *detect regressions*, not just assert that something ran.
- Never use skip / disable / pending / `.only` to make a suite look green.
- If something genuinely can't be tested, say so explicitly and explain why — never silently ship unverified code.
- **Depth** — spec-derived tests & the test-after overfit trap, anti-patterns, level selection, the discrimination procedure, tooling: [references/testing.md](references/testing.md).

## 5. Knowledge & honesty

- Verify, don't assume: existing code → project docs → official library docs → web. Use the code search and doc tools the project's `AGENTS.md` names. Never fabricate APIs, flags, or behavior. "I couldn't verify X" beats a confident guess that cascades into broken design and tasks.

## 6. Persistence (lean, file-based)

Durable context lives in the repo, not in scaffolding trees. Four tiers, smallest footprint that works:

- **`AGENTS.md`** (repo root) — source of truth: conventions, how to build / run / test, and the project's own platform/product choices. A strong AGENTS.md is the single highest-leverage artifact you can keep — clear conventions and commands do more for output quality than any process. Create it if missing; keep it current. Scoped `AGENTS.md` files in subtrees carry directory-specific rules.
- **`ROADMAP.md`** (optional) — milestones at a glance: shipped / in progress / next. A flat checklist you can eyeball, not a planning tree.
- **`NOTES.md`** (per feature, optional) — in-flight decisions, blockers, next step. One file.
- Cross-project facts → your global memory, not the repo.

Skipped on purpose: `PROJECT.md`, `STATE.md`, codebase-doc trees — they go stale faster than they help.
