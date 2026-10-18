import { initOrm, type MikroORM } from "@devmentor/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ConflictError, NotFoundError, TechnologyService } from "../src";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

// Wymaga działającego PostgreSQL i DATABASE_URL_TEST (zob. .env.example).
describe.skipIf(!testDatabaseUrl)("TechnologyService (integracyjny)", () => {
  let orm: MikroORM;
  const service = () => new TechnologyService({ em: orm.em.fork() });

  beforeAll(async () => {
    orm = await initOrm(testDatabaseUrl!);
    await orm.schema.drop();
    await orm.schema.create();
  });

  beforeEach(async () => {
    await orm.schema.clear();
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("tworzy technologię z UUID i znacznikami czasu, a lista jest posortowana po nazwie", async () => {
    await service().create({ name: "TypeScript", slug: "typescript" });
    await service().create({ name: "Go", slug: "go" });

    const list = await service().list();

    expect(list.map((t) => t.name)).toEqual(["Go", "TypeScript"]);
    expect(list[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(list[0].createdAt)).not.toBeNaN();
  });

  it("zgłasza ConflictError przy zduplikowanym slugu — także przy równoczesnym zapisie", async () => {
    const results = await Promise.allSettled([
      service().create({ name: "Rust", slug: "rust" }),
      service().create({ name: "Rust lang", slug: "rust" }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(ConflictError);
  });

  it("aktualizuje i usuwa, a dla nieistniejącego ID rzuca NotFoundError", async () => {
    const created = await service().create({ name: "Jav", slug: "jav" });

    const updated = await service().update(created.id, { name: "Java", slug: "java" });
    await service().delete(created.id);

    expect(updated).toMatchObject({ name: "Java", slug: "java" });
    await expect(service().update(created.id, { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service().delete(created.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
