import { vi } from "vitest";
import type { DatabaseClient, PathKind, SetupContext, SetupSystem } from "../setup/types.ts";

export const ROOT = "/repo";

export interface FakeSystem extends SetupSystem {
  lines: string[];
  paths: Map<string, PathKind>;
  links: Map<string, string>;
  files: Map<string, string>;
  run: ReturnType<typeof vi.fn<SetupSystem["run"]>>;
  copyFile: ReturnType<typeof vi.fn<SetupSystem["copyFile"]>>;
  symlink: ReturnType<typeof vi.fn<SetupSystem["symlink"]>>;
  connect: ReturnType<typeof vi.fn<SetupSystem["connect"]>>;
}

/** System w pamięci: ścieżki, pliki i symlinki z map, komendy i połączenie jako atrapy `vi.fn`. */
export function fakeSystem(overrides: Partial<Pick<SetupSystem, "platform" | "nodeVersion" | "env">> = {}): FakeSystem {
  const lines: string[] = [];
  const paths = new Map<string, PathKind>();
  const links = new Map<string, string>();
  const files = new Map<string, string>();
  return {
    rootDir: ROOT,
    platform: "darwin",
    nodeVersion: "24.0.0",
    env: {},
    ...overrides,
    lines,
    paths,
    links,
    files,
    write: (line) => lines.push(line),
    run: vi.fn<SetupSystem["run"]>().mockResolvedValue(0),
    pathKind: (path) => paths.get(path) ?? "missing",
    readLink: (path) => links.get(path) ?? "",
    readFile: (path) => {
      const content = files.get(path);
      if (content === undefined) throw new Error(`ENOENT: ${path}`);
      return content;
    },
    copyFile: vi.fn<SetupSystem["copyFile"]>(),
    symlink: vi.fn<SetupSystem["symlink"]>(),
    connect: vi.fn<SetupSystem["connect"]>(),
  };
}

export function fakeClient(existing: readonly string[] = []): DatabaseClient & {
  query: ReturnType<typeof vi.fn<DatabaseClient["query"]>>;
  end: ReturnType<typeof vi.fn<DatabaseClient["end"]>>;
} {
  return {
    query: vi.fn<DatabaseClient["query"]>(async (sql, params) => ({
      rowCount: sql.startsWith("SELECT") && existing.includes(String(params?.[0])) ? 1 : 0,
    })),
    escapeIdentifier: (identifier) => `"${identifier}"`,
    end: vi.fn<DatabaseClient["end"]>().mockResolvedValue(undefined),
  };
}

export function contextFor(system: SetupSystem, extra: Partial<SetupContext> = {}): SetupContext {
  return { system, ...extra };
}

export function pgError(code: unknown, message = "pg error"): Error {
  return Object.assign(new Error(message), { code });
}
