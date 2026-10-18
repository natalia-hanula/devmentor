import { describe, expect, it } from "vitest";
import { DatabaseHealthService } from "../src";
import { createFakeEntityManager } from "./fake-entity-manager";

describe("DatabaseHealthService", () => {
  it("zwraca wersję serwera, gdy baza odpowiada", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.execute.mockResolvedValue([{ server_version: "17.11" }]);

    expect(await new DatabaseHealthService({ em }).check()).toEqual({ ok: true, serverVersion: "17.11" });
  });

  it("radzi sobie z pustym wynikiem zapytania", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.execute.mockResolvedValue([]);

    expect(await new DatabaseHealthService({ em }).check()).toEqual({ ok: true, serverVersion: undefined });
  });

  it("zwraca ok: false z komunikatem błędu zamiast rzucać", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.execute.mockRejectedValueOnce(new Error("ECONNREFUSED")).mockRejectedValueOnce("timeout");
    const service = new DatabaseHealthService({ em });

    expect(await service.check()).toEqual({ ok: false, error: "ECONNREFUSED" });
    expect(await service.check()).toEqual({ ok: false, error: "timeout" });
  });
});
