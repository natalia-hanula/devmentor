import { ConflictError, NotFoundError, TechnologyService } from "@devmentor/core";
import { initOrm, Technology, type MikroORM } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";

// Rekordy tworzone przez ten plik mają prefiks, żeby nie ruszać słownika z migracji, którego używa aplikacja.
const SLUG_PREFIX = "it-";

describe("TechnologyService na prawdziwym PostgreSQL", () => {
  let orm: MikroORM;
  const service = () => new TechnologyService({ em: orm.em.fork() });

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await orm.em.fork().nativeDelete(Technology, { slug: { $like: `${SLUG_PREFIX}%` } });
  });

  afterAll(async () => {
    await orm.close(true);
  });

  it("migracje założyły tabelę i słownik startowy", async () => {
    const list = await service().list();

    expect(list.map((t) => t.slug)).toEqual(
      expect.arrayContaining(["typescript", "react", "nextjs", "postgresql"]),
    );
  });

  it("tworzy technologię z UUID i znacznikami czasu", async () => {
    const created = await service().create({ name: "IT Elixir", slug: `${SLUG_PREFIX}elixir` });

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(created.createdAt)).not.toBeNaN();
  });

  it("równoczesne wstawienie tego samego sluga: dokładnie jeden sukces i ConflictError (constraint, nie check-then-write)", async () => {
    const results = await Promise.allSettled([
      service().create({ name: "IT Rust", slug: `${SLUG_PREFIX}rust` }),
      service().create({ name: "IT Rust lang", slug: `${SLUG_PREFIX}rust` }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(ConflictError);
  });

  it("aktualizuje i usuwa, a dla nieistniejącego ID rzuca NotFoundError", async () => {
    const created = await service().create({ name: "IT Jav", slug: `${SLUG_PREFIX}jav` });

    const updated = await service().update(created.id, { name: "IT Java", slug: `${SLUG_PREFIX}java` });
    await service().delete(created.id);

    expect(updated).toMatchObject({ name: "IT Java", slug: `${SLUG_PREFIX}java` });
    await expect(service().update(created.id, { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
  });
});
