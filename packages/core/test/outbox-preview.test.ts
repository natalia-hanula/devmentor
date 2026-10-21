import { describe, expect, it } from "vitest";
import { createLogger, listOutboxMessages, NotFoundError, OutboxMailAdapter } from "../src";

const logger = createLogger({ level: "silent" });

describe("listOutboxMessages", () => {
  it("bez skrzynki (noop) rzuca NotFoundError", () => {
    expect(() => listOutboxMessages(null)).toThrow(NotFoundError);
  });

  it("zwraca wiadomości od najnowszej, tylko pola DTO, z datą ISO", async () => {
    const times = [new Date("2026-10-21T08:00:00.000Z"), new Date("2026-10-21T09:30:00.000Z")];
    const outbox = new OutboxMailAdapter({ logger, now: () => times.shift()! });
    await outbox.send({ to: "a@example.com", subject: "Pierwsza", text: "Treść 1" });
    await outbox.send({ to: "b@example.com", subject: "Druga", text: "Treść 2 https://x.test/t#token=abc" });

    const messages = listOutboxMessages(outbox);

    expect(messages).toEqual([
      { id: expect.any(String), to: "b@example.com", subject: "Druga", text: "Treść 2 https://x.test/t#token=abc", sentAt: "2026-10-21T09:30:00.000Z" },
      { id: expect.any(String), to: "a@example.com", subject: "Pierwsza", text: "Treść 1", sentAt: "2026-10-21T08:00:00.000Z" },
    ]);
    expect(Object.keys(messages[0]!).sort()).toEqual(["id", "sentAt", "subject", "text", "to"]);
  });
});
