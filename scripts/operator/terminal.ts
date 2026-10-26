/** Wejście przerwane, zanim padły wszystkie odpowiedzi: Ctrl+C w trybie raw albo koniec strumienia (Ctrl+D, koniec potoku). */
export class InputClosedError extends Error {
  readonly reason: "cancelled" | "eof";

  constructor(reason: "cancelled" | "eof") {
    super(reason === "cancelled" ? "Przerwano" : "Koniec wejścia");
    this.name = "InputClosedError";
    this.reason = reason;
  }
}

/** Wszystko, czego CLI potrzebuje od terminala — w testach podmieniane atrapą. */
export interface OperatorTerminal {
  write(line: string): void;
  /** Pytanie z widocznym wpisywaniem (echo robi terminal). */
  ask(question: string): Promise<string>;
  /** Pytanie bez echa: w TTY tryb raw i żadnych znaków na wyjściu (także gwiazdek). */
  askHidden(question: string): Promise<string>;
  /** Odłącza się od wejścia, żeby proces mógł się zakończyć. */
  close(): void;
}

/** Strumień wejścia: `process.stdin` albo atrapa. `setRawMode` ma tylko TTY. */
export interface TerminalInput extends NodeJS.ReadableStream {
  isTTY?: boolean;
  setRawMode?(mode: boolean): unknown;
}

export interface TerminalOutput {
  write(chunk: string): unknown;
}

const CTRL_C = "\u0003";
const CTRL_D = "\u0004";
const BACKSPACE = new Set(["\u007f", "\b"]);

/**
 * Terminal na strumieniach. Linie czyta sam (zamiast `readline`), bo hasło w TTY wymaga trybu raw:
 * wtedy terminal nie wyświetla znaków, a Enter, Backspace, Ctrl+C i Ctrl+D obsługujemy tutaj.
 * Bez TTY (potok) czyta kolejne linie z bufora — wiele odpowiedzi może przyjść w jednym kawałku.
 */
export function createTerminal(input: TerminalInput, output: TerminalOutput): OperatorTerminal {
  const isTTY = input.isTTY === true;
  // Tryb raw tylko w prawdziwym TTY; bez niego (potok) i tak nic nie jest wyświetlane.
  const setRawMode = isTTY ? input.setRawMode?.bind(input) : undefined;
  let buffer = "";
  let ended = false;
  let skipLineFeed = false;
  let wake: (() => void) | null = null;

  const notify = () => {
    const resolve = wake;
    wake = null;
    resolve?.();
  };
  const onData = (chunk: string | Buffer) => {
    buffer += chunk.toString();
    notify();
  };
  const onEnd = () => {
    ended = true;
    notify();
  };
  input.setEncoding("utf8");
  input.on("data", onData);
  input.on("end", onEnd);

  /** Zdejmuje z bufora jedną linię; `null`, gdy linia jeszcze się nie skończyła (znaki zostają w `line`). */
  function takeLine(state: { line: string }): string | null {
    while (buffer.length > 0) {
      const char = buffer[0];
      buffer = buffer.slice(1);
      if (skipLineFeed && char === "\n") {
        skipLineFeed = false;
        continue;
      }
      skipLineFeed = false;
      if (char === "\r" || char === "\n") {
        // Enter w trybie raw to "\r"; w potoku z Windows "\r\n" — drugi znak pomijamy.
        skipLineFeed = char === "\r";
        return state.line;
      }
      if (char === CTRL_C) {
        throw new InputClosedError("cancelled");
      }
      if (char === CTRL_D) {
        if (state.line === "") {
          throw new InputClosedError("eof");
        }
        continue;
      }
      if (BACKSPACE.has(char)) {
        state.line = Array.from(state.line).slice(0, -1).join("");
        continue;
      }
      state.line += char;
    }
    return null;
  }

  async function readLine(): Promise<string> {
    const state = { line: "" };
    for (;;) {
      const line = takeLine(state);
      if (line !== null) {
        return line;
      }
      if (ended) {
        if (state.line !== "") {
          return state.line;
        }
        throw new InputClosedError("eof");
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
  }

  async function prompt(question: string, hidden: boolean): Promise<string> {
    output.write(question);
    const rawMode = hidden ? setRawMode : undefined;
    if (rawMode) {
      rawMode(true);
    }
    try {
      return await readLine();
    } finally {
      if (rawMode) {
        rawMode(false);
      }
      // Bez echa (raw albo potok) Enter nie przenosi kursora — robimy to sami.
      if (hidden || !isTTY) {
        output.write("\n");
      }
    }
  }

  return {
    write: (line) => {
      output.write(`${line}\n`);
    },
    ask: (question) => prompt(question, false),
    askHidden: (question) => prompt(question, true),
    close: () => {
      input.off("data", onData);
      input.off("end", onEnd);
      input.pause();
    },
  };
}
