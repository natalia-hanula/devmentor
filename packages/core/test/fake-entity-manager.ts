import type { EntityManager } from "@devmentor/db";
import { vi } from "vitest";

/** Minimalna atrapa EntityManager do testów jednostkowych serwisów (bez bazy). */
export function createFakeEntityManager() {
  const fake = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((_entity: unknown, data: Record<string, unknown>) => ({
      id: "6f1c1f9e-3b8a-4c39-9a51-0c8e7c3a1d2b",
      createdAt: new Date("2026-10-18T10:00:00.000Z"),
      updatedAt: new Date("2026-10-18T10:00:00.000Z"),
      ...data,
    })),
    remove: vi.fn(),
    flush: vi.fn(async () => undefined),
    execute: vi.fn(),
  };
  return { fake, em: fake as unknown as EntityManager };
}
