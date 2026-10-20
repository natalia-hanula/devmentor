/** Wynik kroku instalatora: wykonano, pominięto (już zrobione) albo błąd zatrzymujący dalsze kroki. */
export type StepStatus = "done" | "skipped" | "failed";

export interface StepResult {
  status: StepStatus;
  message: string;
}

export type PathKind = "missing" | "file" | "symlink" | "other";

export interface QueryResult {
  rowCount: number | null;
}

export interface DatabaseClient {
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
  escapeIdentifier(identifier: string): string;
  end(): Promise<void>;
}

/** Wszystko, czego instalator potrzebuje od systemu — w testach jednostkowych podmieniane atrapą. */
export interface SetupSystem {
  readonly rootDir: string;
  readonly platform: string;
  readonly nodeVersion: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  write(line: string): void;
  /** Uruchamia komendę w katalogu repo z wyjściem przekazanym użytkownikowi; zwraca kod wyjścia. */
  run(command: string, args: string[]): Promise<number>;
  pathKind(path: string): PathKind;
  readLink(path: string): string;
  readFile(path: string): string;
  /** Zapisuje plik (nadpisuje) — tylko dla plików, które instalator sam uzupełnia. */
  writeFile(path: string, content: string): void;
  /** Losowy sekret (base64url) do `.env`. */
  generateSecret(): string;
  /** Kopiuje plik; nigdy nie nadpisuje istniejącego celu. */
  copyFile(source: string, destination: string): void;
  symlink(target: string, path: string): void;
  connect(url: string, timeoutMs: number): Promise<DatabaseClient>;
}

/** Stan przekazywany między krokami (np. adres bazy z kroku 5 dla kroków 6–7). */
export interface SetupContext {
  system: SetupSystem;
  database?: { url: URL; name: string };
  client?: DatabaseClient;
}

export interface SetupStep {
  name: string;
  run(context: SetupContext): Promise<StepResult>;
}
