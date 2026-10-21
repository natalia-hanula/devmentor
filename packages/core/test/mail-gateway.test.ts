import { describe, expect, it } from "vitest";
import { createLogger, isMailDeliveryAvailable, isMailOutboxEnabled, NoopMailAdapter, OutboxMailAdapter } from "../src";
import { createMailAdapters } from "../src/services/mail/mail-gateway";

const logger = createLogger({ level: "silent" });

describe("createMailAdapters", () => {
  it("dla outbox zwraca tę samą instancję jako bramkę i skrzynkę", async () => {
    const { mailGateway, mailOutbox } = createMailAdapters({ env: { MAIL_ADAPTER: "outbox" }, logger });

    expect(mailGateway).toBeInstanceOf(OutboxMailAdapter);
    expect(mailOutbox).toBe(mailGateway);

    await mailGateway.send({ to: "ala@example.com", subject: "Temat", text: "Treść" });
    expect(mailOutbox?.list()).toHaveLength(1);
  });

  it("dla noop zwraca NoopMailAdapter i brak skrzynki", () => {
    const { mailGateway, mailOutbox } = createMailAdapters({ env: { MAIL_ADAPTER: "noop" }, logger });

    expect(mailGateway).toBeInstanceOf(NoopMailAdapter);
    expect(mailOutbox).toBeNull();
  });
});

describe("isMailDeliveryAvailable", () => {
  it("false dla noop, true dla outbox", () => {
    expect(isMailDeliveryAvailable({ MAIL_ADAPTER: "noop" })).toBe(false);
    expect(isMailDeliveryAvailable({ MAIL_ADAPTER: "outbox" })).toBe(true);
  });
});

describe("isMailOutboxEnabled", () => {
  it("true tylko dla outbox", () => {
    expect(isMailOutboxEnabled({ MAIL_ADAPTER: "outbox" })).toBe(true);
    expect(isMailOutboxEnabled({ MAIL_ADAPTER: "noop" })).toBe(false);
  });
});
