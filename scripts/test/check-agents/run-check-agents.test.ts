import { describe, expect, it } from "vitest";
import { findRepoPaths, runCheckAgents } from "../../check-agents/run-check-agents.ts";
import type { CheckAgentsSystem } from "../../check-agents/system.ts";

const ROOT = [".ai", "packages", "AGENTS.md", "eslint.config.mjs"];

function fakeSystem(markdown: string, existing: string[]): CheckAgentsSystem {
  return {
    readFile: () => markdown,
    exists: (path) => existing.includes(path),
    listRoot: () => ROOT,
  };
}

function run(markdown: string, existing: string[]) {
  const lines: string[] = [];
  const code = runCheckAgents(fakeSystem(markdown, existing), (line) => lines.push(line));
  return { code, lines };
}

describe("findRepoPaths", () => {
  it("zwraca dosłowne ścieżki zaczynające się od elementu katalogu głównego, bez duplikatów", () => {
    const markdown = "`.ai/docs/a.md` oraz `eslint.config.mjs` i znowu `.ai/docs/a.md`";

    expect(findRepoPaths(markdown, ROOT)).toEqual([".ai/docs/a.md", "eslint.config.mjs"]);
  });

  it("pomija wzorce, URL-e, pakiety i skróty względem pakietu", () => {
    const markdown = [
      "`.ai/specs/YYYY-MM-DD-slug.md`",
      "`packages/<pakiet>/src`",
      "`packages/*/src`",
      "`.ai/docs/a b.md`",
      "`@devmentor/core`",
      "`https://example.com`",
      "`core/src/logger.ts`",
      "`api-handler.ts`",
    ].join(" ");

    expect(findRepoPaths(markdown, ROOT)).toEqual([]);
  });

  it("ignoruje tekst poza apostrofami grawisu", () => {
    expect(findRepoPaths("zobacz .ai/docs/a.md", ROOT)).toEqual([]);
  });
});

describe("runCheckAgents", () => {
  it("kończy się kodem 0, gdy wszystkie ścieżki istnieją", () => {
    const { code, lines } = run("`.ai/docs/a.md` `packages/core`", [".ai/docs/a.md", "packages/core"]);

    expect(code).toBe(0);
    expect(lines).toEqual(["AGENTS.md: wszystkie 2 wymienione ścieżki istnieją."]);
  });

  it("kończy się kodem 1 i wypisuje brakujące ścieżki", () => {
    const { code, lines } = run("`.ai/docs/a.md` `.ai/docs/gone.md` `packages/old`", [".ai/docs/a.md"]);

    expect(code).toBe(1);
    expect(lines).toEqual([
      "AGENTS.md wymienia ścieżki, których nie ma w repozytorium:",
      "  - .ai/docs/gone.md",
      "  - packages/old",
    ]);
  });

  it("nie zgłasza ścieżek spoza checkoutu: sekretów, przykładu pakietu i node_modules", () => {
    const markdown = "`.ai/docs/a.md` `packages/app/.env` `packages/shared` `node_modules/next/dist/docs/`";
    const system = fakeSystem(markdown, [".ai/docs/a.md"]);
    system.listRoot = () => [...ROOT, "node_modules"];
    const lines: string[] = [];

    expect(runCheckAgents(system, (line) => lines.push(line))).toBe(0);
    expect(lines).toEqual(["AGENTS.md: wszystkie 4 wymienione ścieżki istnieją."]);
  });
});
