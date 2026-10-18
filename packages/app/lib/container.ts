import "server-only";
import { asClass, asValue, createAppContainer, type AwilixContainer } from "@devmentor/core";
import { DatabaseHealthService, getOrm, type EntityManager, type MikroORM } from "@devmentor/db";

/** Zależności dostępne w kontenerze głównym (jeden na proces). */
export interface AppCradle {
  orm: MikroORM;
}

/** Zależności dostępne w scope żądania. */
export interface RequestCradle extends AppCradle {
  em: EntityManager;
  databaseHealthService: DatabaseHealthService;
}

const globalForContainer = globalThis as unknown as {
  __devmentorContainer?: Promise<AwilixContainer<AppCradle>>;
};

async function buildContainer(): Promise<AwilixContainer<AppCradle>> {
  const container = createAppContainer<AppCradle>();
  container.register({
    orm: asValue(await getOrm()),
  });
  return container;
}

function getContainer(): Promise<AwilixContainer<AppCradle>> {
  globalForContainer.__devmentorContainer ??= buildContainer().catch((error: unknown) => {
    globalForContainer.__devmentorContainer = undefined;
    throw error;
  });
  return globalForContainer.__devmentorContainer;
}

/**
 * Tworzy scope na jedno żądanie: własny `EntityManager` (`em.fork()`) i serwisy, które z niego korzystają.
 * Wywołuj w Server Components, Server Actions i Route Handlers — nigdy nie współdziel scope między żądaniami.
 */
export async function createRequestScope(): Promise<AwilixContainer<RequestCradle>> {
  const container = await getContainer();
  const scope = container.createScope<RequestCradle>();
  scope.register({
    em: asValue(container.cradle.orm.em.fork()),
    databaseHealthService: asClass(DatabaseHealthService).scoped(),
  });
  return scope;
}
