import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const AGENT_BROWSER_BIN = resolve(import.meta.dirname, "../../../node_modules/.bin/agent-browser");
/** Powyżej domyślnego limitu operacji agent-browser (25 s), żeby to on zgłaszał błąd, nie my. */
const COMMAND_TIMEOUT_MS = 40_000;

export interface Browser {
  /** Uruchamia komendę agent-browser (np. `open <url>`, `wait --text …`) i zwraca jej wyjście. */
  run: (...args: string[]) => Promise<string>;
  close: () => Promise<void>;
}

/** Sesja `agent-browser` izolowana na plik testów. */
export function createBrowser(): Browser {
  const session = `devmentor-it-${randomUUID()}`;

  async function run(...args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(AGENT_BROWSER_BIN, ["--session", session, ...args], {
        timeout: COMMAND_TIMEOUT_MS,
      });
      return stdout.trim();
    } catch (error) {
      const { stdout = "", stderr = "" } = error as { stdout?: string; stderr?: string };
      throw new Error(`agent-browser ${args.join(" ")} nie powiodło się:\n${stdout}\n${stderr}`);
    }
  }

  return {
    run,
    close: async () => {
      await run("close").catch(() => undefined);
    },
  };
}

/**
 * Czeka, aż React podepnie się pod element (hydratacja). `fill` przed hydratacją trafia w HTML z serwera,
 * a hydratacja potrafi wyczyścić wpisaną wartość albo na chwilę podmienić formularz.
 */
export async function waitForHydration(browser: Browser, selector: string): Promise<void> {
  const target = JSON.stringify(selector);
  await browser.run(
    "wait",
    "--fn",
    `(() => { const el = document.querySelector(${target}); return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber")); })()`,
  );
}
