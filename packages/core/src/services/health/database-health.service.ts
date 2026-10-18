import type { EntityManager } from "@devmentor/db";

export interface DatabaseHealth {
  ok: boolean;
  serverVersion?: string;
  error?: string;
}

/**
 * Sprawdza, czy baza odpowiada. Serwis infrastrukturalny — świadomy wyjątek od reguły
 * „każdy serwis ma swoją encję” (zob. `.ai/specs/implemented/2026-10-18-standardy-inzynieryjne.md`).
 */
export class DatabaseHealthService {
  private readonly em: EntityManager;

  constructor({ em }: { em: EntityManager }) {
    this.em = em;
  }

  async check(): Promise<DatabaseHealth> {
    try {
      const [row] = await this.em.execute<{ server_version: string }[]>("show server_version");
      return { ok: true, serverVersion: row?.server_version };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
