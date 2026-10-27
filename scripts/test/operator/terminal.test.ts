import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createTerminal, InputClosedError, type TerminalInput } from "../../operator/terminal.ts";

function streams({ tty }: { tty: boolean }) {
  const input = new PassThrough() as PassThrough & TerminalInput;
  const setRawMode = vi.fn();
  if (tty) {
    Object.assign(input, { isTTY: true, setRawMode });
  }
  const written: string[] = [];
  const output = { write: vi.fn((chunk: string) => written.push(chunk)) };
  const terminal = createTerminal(input, output);
  return { input, setRawMode, written, output: () => written.join(""), terminal };
}

describe("createTerminal — potok (bez TTY)", () => {
  it("czyta kolejne odpowiedzi z jednego kawałka danych, także z końcami linii CRLF", async () => {
    const { input, terminal, output, setRawMode } = streams({ tty: false });
    input.write("ola@example.com\r\nOla\r\ntajne-haslo-12\n");

    await expect(terminal.ask("E-mail: ")).resolves.toBe("ola@example.com");
    await expect(terminal.ask("Nazwa: ")).resolves.toBe("Ola");
    await expect(terminal.askHidden("Hasło: ")).resolves.toBe("tajne-haslo-12");

    // Bez TTY wejście nie jest wyświetlane: po każdym pytaniu nowa linia, hasła na wyjściu nie ma.
    expect(output()).toBe("E-mail: \nNazwa: \nHasło: \n");
    expect(setRawMode).not.toHaveBeenCalled();
  });

  it("czeka na dane przychodzące w kawałkach i składa znaki wielobajtowe", async () => {
    const { input, terminal } = streams({ tty: false });

    const answer = terminal.ask("Nazwa: ");
    const bytes = Buffer.from("Zażółć\n");
    input.write(bytes.subarray(0, 3));
    input.write(bytes.subarray(3));

    await expect(answer).resolves.toBe("Zażółć");
  });

  it("ostatnia linia bez znaku końca linii przed końcem strumienia też jest odpowiedzią", async () => {
    const { input, terminal } = streams({ tty: false });
    input.end("ostatnia");

    await expect(terminal.ask("Pytanie: ")).resolves.toBe("ostatnia");
  });

  it("koniec strumienia przed odpowiedzią → InputClosedError(eof)", async () => {
    const { input, terminal } = streams({ tty: false });

    const answer = terminal.ask("Pytanie: ");
    input.end();

    await expect(answer).rejects.toMatchObject({ name: "InputClosedError", reason: "eof", message: "Koniec wejścia" });
  });

  it("pusta linia to pusta odpowiedź (walidację robi serwis)", async () => {
    const { input, terminal } = streams({ tty: false });
    input.write("\n");

    await expect(terminal.ask("Pytanie: ")).resolves.toBe("");
  });

  it("write dopisuje koniec linii", () => {
    const { terminal, output } = streams({ tty: false });

    terminal.write("Gotowe");

    expect(output()).toBe("Gotowe\n");
  });

  it("close odłącza terminal od wejścia i wstrzymuje strumień — proces może się zakończyć", () => {
    const { input, terminal } = streams({ tty: false });
    const pause = vi.spyOn(input, "pause");

    terminal.close();

    expect(input.listenerCount("data")).toBe(0);
    expect(input.listenerCount("end")).toBe(0);
    expect(pause).toHaveBeenCalledOnce();
  });
});

describe("createTerminal — TTY", () => {
  it("pytanie widoczne: bez trybu raw i bez dodatkowej nowej linii (echo i Enter wyświetla terminal)", async () => {
    const { input, terminal, output, setRawMode } = streams({ tty: true });

    const answer = terminal.ask("E-mail: ");
    input.write("ola@example.com\n");

    await expect(answer).resolves.toBe("ola@example.com");
    expect(setRawMode).not.toHaveBeenCalled();
    expect(output()).toBe("E-mail: ");
  });

  it("hasło: tryb raw na czas pytania, żadnych znaków na wyjściu (bez echa i bez gwiazdek), Enter jako \\r", async () => {
    const { input, terminal, output, setRawMode } = streams({ tty: true });

    const answer = terminal.askHidden("Hasło: ");
    // W trybie raw znaki przychodzą pojedynczo.
    for (const char of "tajne-haslo-12\r") {
      input.write(char);
    }

    await expect(answer).resolves.toBe("tajne-haslo-12");
    expect(setRawMode.mock.calls).toEqual([[true], [false]]);
    expect(output()).toBe("Hasło: \n");
    expect(output()).not.toContain("*");
  });

  it("Backspace usuwa ostatni znak (także emoji), Ctrl+D w środku linii jest ignorowany", async () => {
    const { input, terminal } = streams({ tty: true });

    const answer = terminal.askHidden("Hasło: ");
    input.write("ab😀\u007f\u007fc\bd\u0004e\r");

    await expect(answer).resolves.toBe("ade");
  });

  it("Ctrl+C w trybie raw → InputClosedError(cancelled) i przywrócony tryb terminala", async () => {
    const { input, terminal, output, setRawMode } = streams({ tty: true });

    const answer = terminal.askHidden("Hasło: ");
    input.write("taj\u0003");

    const error = await answer.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InputClosedError);
    expect(error).toMatchObject({ reason: "cancelled", message: "Przerwano" });
    expect(setRawMode).toHaveBeenLastCalledWith(false);
    expect(output()).toBe("Hasło: \n");
  });

  it("Ctrl+D na pustej linii → InputClosedError(eof)", async () => {
    const { input, terminal } = streams({ tty: true });

    const answer = terminal.askHidden("Hasło: ");
    input.write("\u0004");

    await expect(answer).rejects.toMatchObject({ reason: "eof" });
  });

  it("TTY bez setRawMode: hasło czytane bez trybu raw, nadal bez znaków na wyjściu", async () => {
    const input = Object.assign(new PassThrough(), { isTTY: true }) as PassThrough & TerminalInput;
    const written: string[] = [];
    const terminal = createTerminal(input, { write: (chunk: string) => written.push(chunk) });

    const answer = terminal.askHidden("Hasło: ");
    input.write("tajne-haslo-12\n");

    await expect(answer).resolves.toBe("tajne-haslo-12");
    expect(written.join("")).toBe("Hasło: \n");
  });
});
