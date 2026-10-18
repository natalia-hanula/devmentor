import { spawn } from "node:child_process";
import { constants, copyFileSync, lstatSync, readFileSync, readlinkSync, symlinkSync } from "node:fs";
import type { DatabaseClient, PathKind, SetupSystem } from "./types.ts";

/** Prawdziwy system: pliki, procesy potomne i PostgreSQL. Jedyne miejsce instalatora z efektami ubocznymi. */
export function createSystem(rootDir: string): SetupSystem {
  return {
    rootDir,
    platform: process.platform,
    nodeVersion: process.versions.node,
    env: process.env,
    write: (line) => {
      process.stdout.write(`${line}\n`);
    },
    run: (command, args) =>
      new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: rootDir, stdio: "inherit" });
        child.on("error", reject);
        // Proces zabity sygnałem nie ma kodu wyjścia — traktujemy to jako porażkę.
        child.on("close", (code) => resolve(code ?? 1));
      }),
    pathKind,
    readLink: (path) => readlinkSync(path),
    readFile: (path) => readFileSync(path, "utf8"),
    copyFile: (source, destination) => copyFileSync(source, destination, constants.COPYFILE_EXCL),
    symlink: (target, path) => symlinkSync(target, path),
    connect,
  };
}

export function pathKind(path: string): PathKind {
  try {
    const stats = lstatSync(path);
    if (stats.isSymbolicLink()) return "symlink";
    return stats.isFile() ? "file" : "other";
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return "missing";
    throw error;
  }
}

/** `pg` ładujemy dopiero tu: przed krokiem `npm install` pakietu może jeszcze nie być. */
export async function connect(url: string, timeoutMs: number): Promise<DatabaseClient> {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: timeoutMs });
  await client.connect();
  return {
    query: (sql, params) => client.query(sql, params),
    escapeIdentifier: (identifier) => client.escapeIdentifier(identifier),
    end: () => client.end(),
  };
}
