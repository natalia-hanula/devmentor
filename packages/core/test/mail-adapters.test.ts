import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, NoopMailAdapter, OUTBOX_CAPACITY, OutboxMailAdapter, type MailMessage } from "../src";

const TO = "ala@example.com";
const TEXT = "Potwierdź adres: http://localhost:3000/verify-email?token=sekretny-token";

function message(subject: string): MailMessage {
  return { to: TO, subject, text: TEXT };
}

function captureLogger() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const entries = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { logger: createLogger({ destination }), lines, entries };
}

/** Pola dopisywane przez pino do każdego wpisu — reszta to obiekt logu adaptera. */
const PINO_FIELDS = new Set(["level", "time", "pid", "hostname", "msg"]);

function payload(entry: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => !PINO_FIELDS.has(key)));
}

describe("OutboxMailAdapter", () => {
  it("zapisuje wiadomość z id i sentAt z zegara, a list() ją zwraca", async () => {
    const sentAt = new Date("2026-10-21T10:00:00.000Z");
    const outbox = new OutboxMailAdapter({ logger: captureLogger().logger, now: () => sentAt });

    await outbox.send(message("Potwierdź adres"));

    const [stored] = outbox.list();
    expect(stored).toEqual({ id: expect.any(String), to: TO, subject: "Potwierdź adres", text: TEXT, sentAt });
    expect(stored.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("domyślnie stempluje sentAt bieżącym czasem", async () => {
    const outbox = new OutboxMailAdapter({ logger: captureLogger().logger });
    const before = Date.now();

    await outbox.send(message("Temat"));

    const sentAt = outbox.list()[0].sentAt.getTime();
    expect(sentAt).toBeGreaterThanOrEqual(before);
    expect(sentAt).toBeLessThanOrEqual(Date.now());
  });

  it("zwraca wiadomości od najnowszej, każdą z innym id", async () => {
    const outbox = new OutboxMailAdapter({ logger: captureLogger().logger });

    await outbox.send(message("pierwsza"));
    await outbox.send(message("druga"));
    await outbox.send(message("trzecia"));

    const listed = outbox.list();
    expect(listed.map((stored) => stored.subject)).toEqual(["trzecia", "druga", "pierwsza"]);
    expect(new Set(listed.map((stored) => stored.id)).size).toBe(3);
  });

  it(`trzyma najwyżej ${OUTBOX_CAPACITY} wiadomości — najstarsza wypada`, async () => {
    const outbox = new OutboxMailAdapter({ logger: captureLogger().logger });

    for (let index = 0; index < OUTBOX_CAPACITY; index += 1) {
      await outbox.send(message(`wiadomość ${index}`));
    }
    expect(outbox.list()).toHaveLength(OUTBOX_CAPACITY);

    await outbox.send(message("nadmiarowa"));

    const listed = outbox.list();
    expect(OUTBOX_CAPACITY).toBe(100);
    expect(listed).toHaveLength(OUTBOX_CAPACITY);
    expect(listed[0].subject).toBe("nadmiarowa");
    expect(listed.at(-1)?.subject).toBe("wiadomość 1");
    expect(listed.some((stored) => stored.subject === "wiadomość 0")).toBe(false);
  });

  it("list() zwraca kopię — zmiana wyniku nie rusza skrzynki", async () => {
    const outbox = new OutboxMailAdapter({ logger: captureLogger().logger });
    await outbox.send(message("Temat"));

    (outbox.list() as unknown[]).length = 0;

    expect(outbox.list()).toHaveLength(1);
  });

  it("loguje tylko { messageId, subject } — bez adresata i treści", async () => {
    const { logger, lines, entries } = captureLogger();
    const outbox = new OutboxMailAdapter({ logger });

    await outbox.send(message("Potwierdź adres"));

    expect(entries()).toHaveLength(1);
    expect(payload(entries()[0])).toEqual({ messageId: outbox.list()[0].id, subject: "Potwierdź adres" });
    expect(lines.join("")).not.toContain(TO);
    expect(lines.join("")).not.toContain("sekretny-token");
  });
});

describe("NoopMailAdapter", () => {
  it("niczego nie wysyła i loguje tylko { messageId, subject } — bez adresata i treści", async () => {
    const { logger, lines, entries } = captureLogger();
    const noop = new NoopMailAdapter({ logger });

    await expect(noop.send(message("Potwierdź adres"))).resolves.toBeUndefined();

    expect(entries()).toHaveLength(1);
    expect(payload(entries()[0])).toEqual({ messageId: expect.stringMatching(/^[0-9a-f-]{36}$/), subject: "Potwierdź adres" });
    expect(lines.join("")).not.toContain(TO);
    expect(lines.join("")).not.toContain("sekretny-token");
  });
});
