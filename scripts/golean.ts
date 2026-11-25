#!/usr/bin/env bun
// Go Lean spec operations: new, status, check, close, list. No dependencies; add --json for machine output.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const TARGET_BYTES = 10_000;
const WARN_BYTES = 20_000;
const SECTIONS = {
  en: ["Request", "Scope", "Decisions", "Acceptance", "Tasks", "Delivery"],
  pt: ["Pedido", "Escopo", "Decisões", "Aceite", "Tarefas", "Entrega"],
} as const;
const STATUS_LINE = /^Status: \*\*([a-z-]+)\*\*/m;

type Spec = { id: string; slug: string; dir: string; file: string; status: string; bytes: number; archived: boolean };

const args = process.argv.slice(2);
const json = args.includes("--json");
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !["--dir", "--lang"].includes(args[i - 1] ?? ""));
const [command, ...rest] = positional;

function fail(message: string, hint: string): never {
  if (json) console.log(JSON.stringify({ ok: false, error: message, hint }));
  else console.error(`error: ${message}\nnext: ${hint}`);
  process.exit(1);
}

function out(data: unknown, text: string) {
  console.log(json ? JSON.stringify({ ok: true, ...(data as object) }) : text);
}

function findRoot(): string {
  const explicit = flag("--dir") ?? process.env.GOLEAN_DIR;
  if (explicit) return resolve(explicit);
  // Nearest existing golean/ up to the repository root; otherwise create it at the repo root (or cwd outside git).
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    if (existsSync(join(dir, "golean"))) return join(dir, "golean");
    if (existsSync(join(dir, ".git"))) return join(dir, "golean");
    if (dirname(dir) === dir) return join(process.cwd(), "golean");
  }
}

const root = findRoot();

function specsIn(sub: "specs" | "archive"): Spec[] {
  const base = join(root, sub);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((name) => /^\d+-/.test(name) && existsSync(join(base, name, "spec.md")))
    .map((name) => {
      const file = join(base, name, "spec.md");
      const text = readFileSync(file, "utf8");
      return {
        id: name.split("-")[0],
        slug: name,
        dir: join(base, name),
        file,
        status: text.match(STATUS_LINE)?.[1] ?? "unknown",
        bytes: statSync(file).size,
        archived: sub === "archive",
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const all = () => [...specsIn("specs"), ...specsIn("archive")];

function find(ref: string | undefined): Spec {
  if (!ref) fail("missing spec id", "pass the number or slug, e.g. `golean status 105`");
  const matches = all().filter((s) => s.slug === ref || s.id === ref || s.id === ref.padStart(3, "0"));
  if (matches.length === 0) fail(`no spec matches "${ref}"`, "run `golean list --all` to see ids");
  if (matches.length > 1) fail(`"${ref}" matches ${matches.map((s) => s.slug).join(", ")}`, "pass the full slug");
  return matches[0];
}

function setStatus(file: string, status: string) {
  const text = readFileSync(file, "utf8");
  if (!STATUS_LINE.test(text)) fail(`${file} has no "Status: **…**" line`, "add one under the title");
  writeFileSync(file, text.replace(STATUS_LINE, `Status: **${status}**`));
}

function check(spec: Spec) {
  const text = readFileSync(spec.file, "utf8");
  const headings = [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim().toLowerCase());
  const missing = Object.values(SECTIONS)
    .map((names) => names.filter((n) => !headings.some((h) => h.startsWith(n.toLowerCase()))))
    .reduce((a, b) => (a.length <= b.length ? a : b));
  const warnings: string[] = [];
  if (spec.status === "unknown") warnings.push('no "Status: **…**" line');
  if (missing.length) warnings.push(`missing sections: ${missing.join(", ")}`);
  if (spec.bytes > WARN_BYTES)
    warnings.push(`${spec.bytes} bytes (> ${WARN_BYTES}): compress history into one line per task with its commit, or split`);
  else if (spec.bytes > TARGET_BYTES) warnings.push(`${spec.bytes} bytes (target ~${TARGET_BYTES}): keep state, not history`);
  return { slug: spec.slug, status: spec.status, bytes: spec.bytes, warnings };
}

function slugify(title: string) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function gitFiles(): string[] {
  const repo = Bun.spawnSync(["git", "-C", root, "rev-parse", "--show-toplevel"]);
  if (repo.exitCode !== 0) return [];
  const top = repo.stdout.toString().trim();
  const ls = Bun.spawnSync(["git", "-C", top, "ls-files", "*.md"]);
  return ls.stdout.toString().split("\n").filter(Boolean).map((f) => join(top, f));
}

switch (command) {
  case "new": {
    const title = rest.join(" ").trim();
    if (!title) fail("missing title", 'run `golean new "Short title"`');
    const lang = (flag("--lang") ?? "en") as keyof typeof SECTIONS;
    if (!SECTIONS[lang]) fail(`unknown --lang ${lang}`, "use en or pt");
    const next = Math.max(0, ...all().map((s) => Number(s.id))) + 1;
    const slug = `${String(next).padStart(3, "0")}-${slugify(title)}`;
    const dir = join(root, "specs", slug);
    mkdirSync(dir, { recursive: true });
    const [request, scope, decisions, acceptance, tasks, delivery] = SECTIONS[lang];
    const pt = lang === "pt";
    const body = `# ${title}

Status: **draft** — ${pt ? "próximo passo: entrevista" : "next: clarify by interview"}.

## ${request}

${pt ? "O pedido e o motivo, em 1–2 frases." : "The request and why, in 1–2 sentences."}

## ${scope}

- ${pt ? "Dentro" : "In"}:
- ${pt ? "Fora" : "Out"}:
- ${pt ? "Não muda" : "Unchanged"}:

## ${decisions}

| # | ${pt ? "Decisão" : "Decision"} | ${pt ? "Fonte" : "Source"} |
| --- | --- | --- |

## ${acceptance}

- **A1:** Given … When … Then …

## ${tasks}

- **T1** — ${pt ? "fatia verificável sozinha" : "independently verifiable slice"}. Done when: … Test: …

## ${delivery}

${pt ? "Uma linha por tarefa entregue, com o commit." : "One line per delivered task, with its commit."}
`;
    writeFileSync(join(dir, "spec.md"), body);
    out({ slug, file: join(dir, "spec.md") }, `created ${relative(process.cwd(), join(dir, "spec.md"))}`);
    break;
  }
  case "status": {
    const spec = find(rest[0]);
    const next = rest[1];
    if (next) {
      if (!/^[a-z-]+$/.test(next)) fail(`invalid status "${next}"`, "use draft, in-progress or closed");
      if (next === "closed") fail("closing moves the spec to the archive", `run \`golean close ${spec.id}\``);
      setStatus(spec.file, next);
    }
    out({ slug: spec.slug, status: next ?? spec.status }, `${spec.slug}: ${next ?? spec.status}`);
    break;
  }
  case "check": {
    const specs = rest[0] ? [find(rest[0])] : specsIn("specs");
    const results = specs.map(check);
    out(
      { results },
      results.map((r) => `${r.slug} (${r.status}, ${r.bytes} B): ${r.warnings.length ? r.warnings.join("; ") : "ok"}`).join("\n") ||
        "no open specs",
    );
    break;
  }
  case "close": {
    const spec = find(rest[0]);
    if (spec.archived) fail(`${spec.slug} is already archived`, "nothing to do");
    setStatus(spec.file, "closed");
    const target = join(root, "archive", spec.slug);
    mkdirSync(join(root, "archive"), { recursive: true });
    renameSync(spec.dir, target);
    // Repoint links: `specs/<slug>` anywhere, sibling `../<slug>/` from open specs, and the moved spec's own sibling links.
    const open = new Set(specsIn("specs").map((s) => s.slug));
    const movedFile = join(target, "spec.md");
    const files = new Set([...gitFiles().filter(existsSync), movedFile]);
    const updated = [...files].filter((file) => {
      const text = readFileSync(file, "utf8");
      let next = text.replaceAll(`specs/${spec.slug}`, `archive/${spec.slug}`);
      if (dirname(dirname(file)) === join(root, "specs")) next = next.replaceAll(`](../${spec.slug}/`, `](../../archive/${spec.slug}/`);
      if (file === movedFile)
        next = next.replace(/\]\(\.\.\/([^/)]+)\//g, (m, slug) => (open.has(slug) ? `](../../specs/${slug}/` : m));
      if (next === text) return false;
      writeFileSync(file, next);
      return true;
    });
    out(
      { slug: spec.slug, archived: target, updatedReferences: updated },
      `closed ${spec.slug} → ${relative(process.cwd(), target)}; updated links in ${updated.length} file(s)`,
    );
    break;
  }
  case "list": {
    const specs = args.includes("--all") ? all() : specsIn("specs");
    out(
      { specs: specs.map(({ slug, status, bytes, archived }) => ({ slug, status, bytes, archived })) },
      specs.map((s) => `${s.slug.padEnd(52)} ${s.status.padEnd(12)} ${String(s.bytes).padStart(7)} B`).join("\n") || "no specs",
    );
    break;
  }
  default:
    fail(
      command ? `unknown command "${command}"` : "missing command",
      'golean new "<title>" [--lang pt] | status <id> [draft|in-progress] | check [id] | close <id> | list [--all]  (--dir <golean>, --json)',
    );
}
