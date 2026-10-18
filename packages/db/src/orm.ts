import { MikroORM } from "@mikro-orm/postgresql";
import { createOrmConfig, requireDatabaseUrl } from "./config";

const globalForOrm = globalThis as unknown as { __devmentorOrm?: Promise<MikroORM> };

/**
 * Zwraca jedną instancję MikroORM (i jedną pulę połączeń) na proces.
 * Promise trzymamy na `globalThis`, żeby HMR w `next dev` nie otwierał nowych pul.
 */
export function getOrm(): Promise<MikroORM> {
  globalForOrm.__devmentorOrm ??= MikroORM.init(
    createOrmConfig({ clientUrl: requireDatabaseUrl() }),
  ).catch((error: unknown) => {
    globalForOrm.__devmentorOrm = undefined;
    throw error;
  });
  return globalForOrm.__devmentorOrm;
}
