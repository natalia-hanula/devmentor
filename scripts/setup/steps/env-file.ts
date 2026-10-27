import { join } from "node:path";
import type { SetupStep } from "../types.ts";

export const ROOT_ENV = ".env";
export const ENV_EXAMPLE = ".env.example";
/** Next.js czyta `.env` tylko z katalogu aplikacji, więc wskazuje on na główny plik. */
export const APP_ENV = join("packages", "app", ".env");
export const APP_ENV_TARGET = join("..", "..", ".env");
/** `.env` trzyma sekrety (`AUTH_JWT_SECRET`, hasło bazy) — odczyt i zapis tylko dla właściciela pliku. */
export const ENV_FILE_MODE = 0o600;

export const envFileStep: SetupStep = {
  name: "Plik .env",
  async run({ system }) {
    const envPath = join(system.rootDir, ROOT_ENV);
    if (system.pathKind(envPath) !== "missing") {
      return { status: "skipped", message: ".env istnieje — nie nadpisuję" };
    }
    system.copyFile(join(system.rootDir, ENV_EXAMPLE), envPath);
    system.chmod(envPath, ENV_FILE_MODE);
    return { status: "done", message: `utworzono .env z ${ENV_EXAMPLE}` };
  },
};

/** Wartość `APP_ENV` dla lokalnej instalacji (domyślna `production` jest dla serwera, nie dla laptopa). */
const LOCAL_APP_ENV = "local";

/**
 * Uzupełnia w istniejącym `.env` zmienne, bez których aplikacja nie ruszy: sekret sesji i `APP_ENV=local`.
 * Wartości, które już tam są, zostają nietknięte; pusty wpis własnych kluczy jest wypełniany.
 */
export const sessionEnvStep: SetupStep = {
  name: "Sekret sesji i APP_ENV",
  async run({ system }) {
    const envPath = join(system.rootDir, ROOT_ENV);
    const original = system.readFile(envPath);
    let content = original;
    const added: string[] = [];

    for (const [key, value] of [
      ["AUTH_JWT_SECRET", system.generateSecret()],
      ["APP_ENV", LOCAL_APP_ENV],
    ] as const) {
      if (hasValue(content, key)) continue;
      content = withValue(content, key, value);
      added.push(key);
    }

    if (added.length === 0) {
      return { status: "skipped", message: "AUTH_JWT_SECRET i APP_ENV są już w .env" };
    }
    system.writeFile(envPath, content);
    // Istniejący plik mógł powstać z szerszymi uprawnieniami (np. ręczne `cp`), a teraz ma sekret.
    system.chmod(envPath, ENV_FILE_MODE);
    return { status: "done", message: `dopisano do .env: ${added.join(", ")}` };
  },
};

const lineFor = (key: string) => new RegExp(`^${key}=(.*)$`, "m");

function hasValue(content: string, key: string): boolean {
  return (lineFor(key).exec(content)?.[1] ?? "").trim() !== "";
}

function withValue(content: string, key: string, value: string): string {
  if (lineFor(key).test(content)) {
    return content.replace(lineFor(key), () => `${key}=${value}`);
  }
  const separator = content === "" || content.endsWith("\n") ? "" : "\n";
  return `${content}${separator}${key}=${value}\n`;
}

export const appEnvLinkStep: SetupStep = {
  name: "Symlink packages/app/.env",
  async run({ system }) {
    const linkPath = join(system.rootDir, APP_ENV);
    // `pathKind` opiera się na `lstat`, więc „wiszący” symlink też jest wykrywany jako symlink.
    const kind = system.pathKind(linkPath);
    if (kind === "missing") {
      system.symlink(APP_ENV_TARGET, linkPath);
      return { status: "done", message: `utworzono ${APP_ENV} → ${APP_ENV_TARGET}` };
    }
    if (kind === "symlink" && system.readLink(linkPath) === APP_ENV_TARGET) {
      return { status: "skipped", message: `${APP_ENV} wskazuje na ${APP_ENV_TARGET}` };
    }
    return {
      status: "skipped",
      message:
        `uwaga: ${APP_ENV} istnieje, ale nie jest symlinkiem do ${APP_ENV_TARGET} — zostawiam bez zmian. ` +
        `Jeśli aplikacja nie widzi zmiennych, napraw: rm ${APP_ENV} && ln -s ${APP_ENV_TARGET} ${APP_ENV}`,
    };
  },
};
