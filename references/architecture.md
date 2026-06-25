# Architecture reference — reuse-first, modular monolith

Loaded on demand from DESIGN. The core instinct this encodes: **an agent's default is to generate —
to write new code. Invert it.** Writing new code is the last resort; finding what already exists is
the first move. Be lazy about the *solution*, never about the *reading*.

## The build ladder — investigate before you create

Before adding any code or dependency, stop at the first rung that holds:

1. **Does this need to exist at all?** No → don't build it.
2. **Does this project already do it?** Reuse it. (`cc2` to find it, `xray` to read it.)
3. **Does the language stdlib / runtime do it?** Use it.
4. **Does a dependency you already have do it?** Use it.
5. **Does the framework or platform provide it as a supported, maintained feature?** Use that.
6. **Is it one line?** Write the one line.
7. **Only now** — write the minimum new code that works.

The discipline isn't "never write code." It's "never write code you didn't first confirm you needed." The shortest working diff wins — but only after you understand the problem.

## Why reuse-first, and where to look

The failure mode it prevents is generic and deeper than any one platform: *why would a system build from
scratch without first checking whether the thing already exists and is well-supported right here?* The
pattern that keeps repeating —

> A platform/library team spends years solving a problem. Someone wraps it in a package. You install the
> wrapper. The wrapper goes unmaintained. You debug the wrapper. — Prefer the thing that's already maintained for you.

So scan, in rough order of preference:

- **This project** — existing utilities, modules, patterns. Search before adding a helper.
- **Installed dependencies** — what you already pull in often covers it.
- **Stdlib / runtime / browser** — the environment you're already on ships a lot for free.
- **Framework built-ins** — auth, validation, jobs, caching, routing are frequently already there.
- **Managed platform services** — prefer a supported product over hand-rolled infrastructure.

**Keep the platform catalog in the project, not the skill.** Which specific managed products *this*
project should reach for is a per-project fact — record it in the project's own `AGENTS.md`. For example,
a Cloudflare project might note: *Queues for async jobs, KV for sessions/flags, D1 for relational, R2 for
objects, Durable Objects for coordination/WebSockets, Workflows for durable multi-step.* A different stack
has a different list. The skill stays platform-agnostic; the project stays explicit.

## Default shape: modular monolith / monorepo

Microservices' *principles* (clear boundaries, explicit contracts, independent reasoning) without the
operational sprawl (network hops, distributed transactions, ops overhead).

- **One deployable, clear internal modules.** Each module owns its domain; cross-module calls go through an explicit interface, not reach-ins.
- **Boundaries by domain, not by layer.** `billing/`, `auth/`, `media/` — each with its own surface — beats a global `controllers/ services/ models/` split.
- **Contracts at the seams.** A module exposes a typed interface (its `Produces`); consumers depend on that, not internals. That's also what makes a module cleanly *extractable* later if it ever truly needs to be its own service.
- **Split to a service only on real pressure** — independent scaling, separate deploy cadence, a hard isolation/compliance boundary. Never on speculation.

## Design discipline — request-path thinking, at monolith scale

Borrow the rigor of big-systems architecture, not its service count:

- **Trace one representative request end to end** through every module and primitive it touches, and diagram it (see [diagrams.md](diagrams.md)).
- **Name where state lives and how it stays consistent** — which store, what consistency guarantee, who is the source of truth.
- **Find the pressure points** — what needs caching, what needs a queue, what must be idempotent, where retries/backpressure live — and address each with an existing primitive (ladder rung 5), not new infrastructure.
- **Mark the boundaries** in the diagram — trust/auth boundaries, and which components are managed vs. hand-built.
