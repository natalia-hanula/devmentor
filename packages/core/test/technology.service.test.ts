import { Technology, UniqueConstraintViolationException } from "@devmentor/db";
import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError, TechnologyService } from "../src";
import { createFakeEntityManager } from "./fake-entity-manager";

const ID = "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b";
const NOW = new Date("2026-10-18T10:00:00.000Z");

function storedTechnology(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: ID, name: "Go", slug: "go", createdAt: NOW, updatedAt: NOW, ...overrides };
}

describe("TechnologyService", () => {
  it("list zwraca DTO posortowane po nazwie", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.find.mockResolvedValue([storedTechnology()]);

    const list = await new TechnologyService({ em }).list();

    expect(fake.find).toHaveBeenCalledWith(Technology, {}, { orderBy: { name: "asc" } });
    expect(list).toEqual([
      { id: ID, name: "Go", slug: "go", createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
    ]);
  });

  it("create tworzy encję tylko z jawnych pól i zapisuje ją", async () => {
    const { fake, em } = createFakeEntityManager();

    const created = await new TechnologyService({ em }).create({ name: "Rust", slug: "rust" });

    expect(fake.create).toHaveBeenCalledWith(Technology, { name: "Rust", slug: "rust" });
    expect(fake.flush).toHaveBeenCalledOnce();
    expect(created).toMatchObject({ id: ID, name: "Rust", slug: "rust" });
  });

  it("create zamienia naruszenie unikalności na ConflictError", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.flush.mockRejectedValue(new UniqueConstraintViolationException(new Error("duplicate key")));

    await expect(new TechnologyService({ em }).create({ name: "Go", slug: "go" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("create przepuszcza inne błędy zapisu bez zmian", async () => {
    const { fake, em } = createFakeEntityManager();
    const failure = new Error("disk full");
    fake.flush.mockRejectedValue(failure);

    await expect(new TechnologyService({ em }).create({ name: "Go", slug: "go" })).rejects.toBe(failure);
  });

  it("update zmienia tylko przekazane pola", async () => {
    const { fake, em } = createFakeEntityManager();
    const entity = storedTechnology();
    fake.findOne.mockResolvedValue(entity);
    const service = new TechnologyService({ em });

    await service.update(ID, { name: "Golang" });
    expect(entity).toMatchObject({ name: "Golang", slug: "go" });

    await service.update(ID, { slug: "golang" });
    expect(entity).toMatchObject({ name: "Golang", slug: "golang" });

    const unchanged = await service.update(ID, {});
    expect(unchanged).toMatchObject({ name: "Golang", slug: "golang" });
    expect(fake.findOne).toHaveBeenCalledWith(Technology, { id: ID });
  });

  it("delete usuwa istniejącą technologię", async () => {
    const { fake, em } = createFakeEntityManager();
    const entity = storedTechnology();
    fake.findOne.mockResolvedValue(entity);

    await new TechnologyService({ em }).delete(ID);

    expect(fake.remove).toHaveBeenCalledWith(entity);
    expect(fake.flush).toHaveBeenCalledOnce();
  });

  it("update i delete rzucają NotFoundError dla nieistniejącego ID", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.findOne.mockResolvedValue(null);
    const service = new TechnologyService({ em });

    await expect(service.update(ID, { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.delete(ID)).rejects.toBeInstanceOf(NotFoundError);
    expect(fake.flush).not.toHaveBeenCalled();
  });
});
