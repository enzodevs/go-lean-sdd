# Testing reference — discriminating tests that catch regressions

Loaded on demand from Execute / §4. One rule underneath everything here: **a test earns its place only
if it would fail when the behavior breaks.** A test that can't fail is documentation pretending to be a test.

## Where the expected outcome comes from (the thing that actually matters)

The real dial is **not** "TDD vs. test-after." It's: does the test's expected result come from the **spec**
or from the **code**?

- **Spec-derived (right):** the expected outcome comes from the acceptance criteria (the Given/When/Then). The test encodes what the code *should* do.
- **Code-derived (wrong):** you read the finished implementation, then write tests asserting what it *currently* does. This is overfitting — the test mirrors the code, so it passes by construction and cannot catch the implementation's bugs. Worse, it's green on the first run, which feels productive and proves nothing.

Practical rules:

1. **Derive every test from the spec/behavior, never by reading the implementation.**
2. **Watch each test fail before you make it pass.** The observed failure is the proof it exercises the behavior and isn't vacuous.
3. If you *must* add tests to code that already exists (legacy, inherited), still derive them from intended behavior — and run the discrimination check below, because test-after is structurally prone to overfit.

## TDD vs. alongside — same oracle, different ceremony

Both are spec-first; pick by how costly a mistake is:

- **Strict TDD** (red → green → refactor, one test at a time): worth the ritual for gnarly logic — algorithms, parsers, state machines, money, auth — where edge cases are many and correctness is load-bearing.
- **Test-alongside** (write test and code together, see it fail, see it pass): the pragmatic **default** for most features. Same spec-derived oracle, same fail-first proof, less ceremony.
- **Avoid:** all code first, then all tests at the end. That's the overfit path, every time.

The invariant in all cases: **spec-derived oracle + an observed failure before the pass.**

## Test behavior, not implementation

A good test survives a refactor that preserves behavior and fails a change that breaks it.

- Assert on **observable outcomes** — return values, emitted events, persisted state, HTTP responses — not internals (private methods, call counts, intermediate variables).
- **Don't over-mock.** Mocking the unit under test, or asserting "this internal function was called," tests the wiring you wrote, not the result the user gets. Mock at real boundaries (network, clock, randomness), not inside your own logic.
- **Name by behavior** ("rejects an expired token"), not by method ("test_refresh").

## Anti-patterns checklist (reject these in review)

- Shallow assertions — `toBeTruthy()`, "no error thrown", asserting a non-null without asserting the *value*.
- Asserting on mocks/spies instead of outcomes.
- Snapshot-everything (a snapshot that no human reads just locks in current output, bugs included).
- Testing private internals or implementation structure.
- One giant test that can fail for ten reasons — you can't tell what broke.
- A test with no scenario in which it would fail.
- Expected values copy-pasted *from the code's output* rather than derived from the spec.
- Uncontrolled time/randomness/order → flaky. Inject the clock, seed the RNG.
- `skip` / `pending` / `.only` left in to make the suite look green.

## Choosing the level

- **Unit** — pure logic, branches, edge cases. Fast; the bulk of your tests.
- **Integration** — a module with its real collaborators (db, queue, fs). Tests the seams.
- **e2e** — one happy path + the few critical user-visible flows. Few, high-value, slow.

Rule of thumb: **push each assertion to the lowest level that can still observe the behavior**; reserve e2e for what only e2e can prove. For a Large feature, sketch which AC maps to which test at which level *before* implementing — a 3-line table, not a document.

## The discrimination check (expanded)

After the suite is green, prove the tests actually bite. Mutate the new code in 1–2 high-risk spots and confirm a test goes red:

- flip a conditional (`>` → `>=`, `==` → `!=`),
- change a return value or a constant,
- remove an edge-case guard,
- drop a side effect (skip the write/emit).

If nothing fails, the test is decorative — strengthen the assertion or add the missing case, then revert the mutation. Aim mutations at the riskiest new code (validation, auth, money, state transitions). High-stakes modules: use real mutation tooling if the project has it; otherwise 1–2 by hand is enough to catch vacuous tests. For low-risk glue (UI wiring, plumbing), a reviewer pass plus targeted regression tests can stand in for hand-mutation; reserve literal mutation for high-risk logic.

## Tooling — fast, batteries-included, mature-enough

Tests, types, and lint run constantly in the build loop, so **a slow gate is a skipped gate — speed is a feature.** And a batteries-included runner means less test scaffolding to hand-write: the reuse-first ladder applies to your test stack too.

- **Use the project's existing runner** — don't introduce a second one. (`cc2`/grep the repo first.)
- **Choosing for a new project:** prefer fast + batteries-included that is *mature enough for your needs*; weigh maturity and rule flexibility against speed. Modern engines often win here (e.g. in the TS ecosystem a Vite-powered runner over a heavier legacy one; a fast Rust-based linter where its rule coverage already suffices). These move fast — confirm the current state via `context7` rather than trusting a fixed recommendation.
- **Record the project's chosen stack in its `AGENTS.md`**, not in this skill — same rule as platform products. This reference stays tool-agnostic.
- **Always run the suite and report real output.** Never claim "tests pass" without the run and its counts.
