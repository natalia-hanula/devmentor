import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.hoisted(() => vi.fn(async () => undefined));
const parseEnv = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({ connection }));
vi.mock("@devmentor/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/core")>()),
  parseEnv,
}));

const { OutboxNavLink } = await import("../app/(operator)/outbox-nav-link");

describe("OutboxNavLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("z outboxem pokazuje „Skrzynka” — env czytany dopiero po connection()", async () => {
    parseEnv.mockImplementation(() => {
      expect(connection).toHaveBeenCalled();
      return { MAIL_ADAPTER: "outbox" };
    });

    render(await OutboxNavLink({ className: "nav" }));

    expect(screen.getByRole("link", { name: "Skrzynka" })).toHaveAttribute("href", "/admin/outbox");
    expect(screen.getByRole("link", { name: "Skrzynka" })).toHaveClass("nav");
  });

  it("przy noop nie pokazuje pozycji", async () => {
    parseEnv.mockReturnValue({ MAIL_ADAPTER: "noop" });

    expect(await OutboxNavLink({ className: "nav" })).toBeNull();
  });
});
