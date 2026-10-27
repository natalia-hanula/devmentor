import { UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";
import { vi } from "vitest";

/** Minimalna atrapa EntityManager do testów jednostkowych serwisów (bez bazy). */
export function createFakeEntityManager() {
  const fake = {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn((_entity: unknown, data: Record<string, unknown>) => ({
      id: "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b",
      createdAt: new Date("2026-10-18T10:00:00.000Z"),
      updatedAt: new Date("2026-10-18T10:00:00.000Z"),
      ...data,
    })),
    remove: vi.fn(),
    flush: vi.fn(async () => undefined),
    // Atrapa nie cofa zmian: testy sprawdzają, że praca idzie przez przekazany EM, a wyjątek wychodzi z callbacka.
    transactional: vi.fn(async (callback: (em: unknown) => unknown) => callback(fake)),
    execute: vi.fn(),
    upsert: vi.fn(async () => undefined),
    nativeDelete: vi.fn(async () => 0),
    nativeUpdate: vi.fn(async () => 0),
    getReference: vi.fn((_entity: unknown, id: string) => ({ id })),
    createQueryBuilder: vi.fn(() => createFakeQueryBuilder().qb),
  };
  return { fake, em: fake as unknown as EntityManager };
}

/**
 * Minimalna atrapa QueryBuildera (DELETE przez natywny builder, `UPDATE … RETURNING`): zapisuje wywołania łańcucha,
 * `execute` zwraca wiersze z `rows`. Sprawdza kształt zapytania, nie jego semantykę — tę sprawdzają testy
 * integracyjne na prawdziwej bazie.
 */
export function createFakeQueryBuilder(rows: unknown[] = []) {
  const nativeQuery = { returning: vi.fn(() => nativeQuery) };
  const qb = {
    delete: vi.fn(() => qb),
    update: vi.fn(() => qb),
    where: vi.fn(() => qb),
    returning: vi.fn(() => qb),
    execute: vi.fn(async () => rows),
    getNativeQuery: vi.fn(() => nativeQuery),
  };
  return { qb, nativeQuery };
}

/** Naruszenie unikalności jak z PostgreSQL: sterownik niesie nazwę ograniczenia w polu `constraint`, a MikroORM je kopiuje. */
export function uniqueViolation(constraint: string): UniqueConstraintViolationException {
  return new UniqueConstraintViolationException(Object.assign(new Error(`duplicate key ${constraint}`), { constraint }));
}
