import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSystem } from "../../check-agents/system.ts";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-agents-"));
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "AGENTS.md"), "treść");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("createSystem", () => {
  it("czyta pliki, sprawdza istnienie i listuje katalog główny względem podanego korzenia", () => {
    const system = createSystem(root);

    expect(system.readFile("AGENTS.md")).toBe("treść");
    expect(system.exists("docs")).toBe(true);
    expect(system.exists("docs/brak.md")).toBe(false);
    expect(system.listRoot().sort()).toEqual(["AGENTS.md", "docs"]);
  });
});
