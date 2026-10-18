import { MikroORM } from "@mikro-orm/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOrmConfig } from "../src/config";
import { DatabaseHealthService } from "../src/database-health-service";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

// Wymaga działającego PostgreSQL i DATABASE_URL_TEST (zob. .env.example).
describe.skipIf(!testDatabaseUrl)("DatabaseHealthService (integracyjny)", () => {
  let orm: MikroORM;

  beforeAll(async () => {
    orm = await MikroORM.init(createOrmConfig({ clientUrl: testDatabaseUrl! }));
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("zgłasza działającą bazę i wersję serwera", async () => {
    const service = new DatabaseHealthService({ em: orm.em.fork() });

    const health = await service.check();

    expect(health.ok).toBe(true);
    expect(health.serverVersion).toMatch(/^\d+/);
  });
});

describe("DatabaseHealthService przy niedostępnej bazie", () => {
  it("zwraca ok: false zamiast rzucać wyjątek", async () => {
    // Port 1 — połączenie od razu odrzucone.
    const orm = new MikroORM(
      createOrmConfig({ clientUrl: "postgresql://devmentor:devmentor@127.0.0.1:1/devmentor" }),
    );
    try {
      const service = new DatabaseHealthService({ em: orm.em.fork() });

      const health = await service.check();

      expect(health.ok).toBe(false);
      expect(health.error).toBeTruthy();
    } finally {
      await orm.close(true);
    }
  });
});
