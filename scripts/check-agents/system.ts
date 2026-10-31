import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface CheckAgentsSystem {
  readFile(path: string): string;
  exists(path: string): boolean;
  listRoot(): string[];
}

export function createSystem(root: string): CheckAgentsSystem {
  return {
    readFile: (path) => readFileSync(join(root, path), "utf8"),
    exists: (path) => existsSync(join(root, path)),
    listRoot: () => readdirSync(root),
  };
}
