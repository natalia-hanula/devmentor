import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const APP_DIR = resolve(REPO_ROOT, "packages/app");
const NEXT_BIN = resolve(REPO_ROOT, "node_modules/.bin/next");
const STARTUP_TIMEOUT_MS = 60_000;
// Dane testowe, nie sekret: baza i aplikacja żyją tylko przez czas przebiegu testów.
const TEST_AUTH_JWT_SECRET = "testowy-sekret-sesji-tylko-do-testow-integracyjnych";
const POLL_INTERVAL_MS = 250;

export interface AppServer {
  url: string;
  stop: () => Promise<void>;
}

/** Uruchamia zbudowaną aplikację (`next start`) na wolnym porcie, podłączoną do wskazanej bazy. */
export async function startAppServer(databaseUrl: string): Promise<AppServer> {
  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}`;
  const output: string[] = [];

  const child = spawn(NEXT_BIN, ["start", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: APP_DIR,
    // Zmienne procesu mają pierwszeństwo przed `.env`, więc lokalny `.env` nie przesłoni bazy testowej.
    env: { ...process.env, DATABASE_URL: databaseUrl, LOG_LEVEL: "warn", AUTH_JWT_SECRET: TEST_AUTH_JWT_SECRET, APP_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk: Buffer) => output.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => output.push(chunk.toString()));

  try {
    await waitUntilHealthy(url, child);
  } catch (error) {
    await stopProcess(child);
    throw new Error(`Aplikacja nie wystartowała: ${(error as Error).message}\n--- log next start ---\n${output.join("")}`);
  }

  return { url, stop: () => stopProcess(child) };
}

async function waitUntilHealthy(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`proces zakończył się z kodem ${child.exitCode}`);
    }
    if (await isHealthy(url)) {
      return;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, POLL_INTERVAL_MS));
  }
  throw new Error(`brak zdrowego /api/health po ${STARTUP_TIMEOUT_MS} ms`);
}

async function isHealthy(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/health`);
    const body = (await response.json()) as { ok?: boolean; data?: { ok?: boolean } };
    return body.ok === true && body.data?.ok === true;
  } catch {
    return false;
  }
}

function findFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolveStop) => {
    child.once("exit", () => resolveStop());
    child.kill("SIGTERM");
  });
}
