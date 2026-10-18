import { MikroORM } from "@mikro-orm/postgresql";
import { createOrmConfig } from "./config";

/**
 * Inicjalizuje MikroORM (i pulę połączeń). Pojedynczą instancję na proces
 * trzyma kontener DI w `@devmentor/core` — nie wywołuj tego per żądanie.
 */
export function initOrm(clientUrl: string): Promise<MikroORM> {
  return MikroORM.init(createOrmConfig({ clientUrl }));
}
