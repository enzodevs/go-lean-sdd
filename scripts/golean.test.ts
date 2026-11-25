import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cli = join(import.meta.dir, "golean.ts");
const run = (cwd: string, ...args: string[]) => {
  const p = Bun.spawnSync(["bun", cli, ...args, "--json"], { cwd });
  return { code: p.exitCode, body: JSON.parse(p.stdout.toString() || p.stderr.toString()) };
};

test("new → status → check → close keeps links working", () => {
  const repo = mkdtempSync(join(tmpdir(), "golean-"));
  Bun.spawnSync(["git", "init", "-q"], { cwd: repo });

  expect(run(repo, "new", "First thing").body.slug).toBe("001-first-thing");
  expect(run(repo, "new", "Ação de teste", "--lang", "pt").body.slug).toBe("002-acao-de-teste");

  const first = join(repo, "golean/specs/001-first-thing/spec.md");
  const second = join(repo, "golean/specs/002-acao-de-teste/spec.md");
  writeFileSync(first, readFileSync(first, "utf8") + "\nSee [two](../002-acao-de-teste/spec.md).\n");
  writeFileSync(second, readFileSync(second, "utf8") + "\nSee [one](../001-first-thing/spec.md).\n");
  writeFileSync(join(repo, "README.md"), "[one](golean/specs/001-first-thing/spec.md)\n");
  Bun.spawnSync(["git", "add", "-A"], { cwd: repo });

  expect(run(repo, "status", "1", "in-progress").body.status).toBe("in-progress");
  expect(run(repo, "status", "1", "closed").code).toBe(1); // closing must go through `close`
  expect(run(repo, "check", "1").body.results[0].warnings).toEqual([]);
  expect(run(repo, "check", "2").body.results[0].warnings).toEqual([]); // pt sections recognised

  const closed = run(repo, "close", "1").body;
  const moved = join(repo, "golean/archive/001-first-thing/spec.md");
  expect(existsSync(moved)).toBe(true);
  expect(readFileSync(moved, "utf8")).toContain("Status: **closed**");
  expect(readFileSync(moved, "utf8")).toContain("](../../specs/002-acao-de-teste/");
  expect(readFileSync(second, "utf8")).toContain("](../../archive/001-first-thing/");
  expect(readFileSync(join(repo, "README.md"), "utf8")).toContain("golean/archive/001-first-thing/");
  expect(closed.updatedReferences.length).toBe(3);

  expect(run(repo, "list").body.specs.map((s: { slug: string }) => s.slug)).toEqual(["002-acao-de-teste"]);
  expect(run(repo, "new", "Third").body.slug).toBe("003-third"); // numbering counts the archive
});

test("check warns on size and never fails", () => {
  const repo = mkdtempSync(join(tmpdir(), "golean-"));
  run(repo, "new", "Big");
  const file = join(repo, "golean/specs/001-big/spec.md");
  writeFileSync(file, readFileSync(file, "utf8") + "x".repeat(21_000));
  const r = run(repo, "check");
  expect(r.code).toBe(0);
  expect(r.body.results[0].warnings.join()).toContain("compress");
});
