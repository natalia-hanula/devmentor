import { createContainer, InjectionMode, type AwilixContainer } from "awilix";

/**
 * Tworzy kontener DI z ustawieniami obowiązującymi w całym projekcie:
 * - `PROXY` — zależności przychodzą jako jeden obiekt (`constructor({ em, logger })`),
 * - `strict` — Awilix zgłasza błąd, gdy singleton zależy od czegoś o krótszym czasie życia.
 *
 * `Cradle` opisuje, co da się z kontenera rozwiązać.
 */
export function createAppContainer<Cradle extends object>(): AwilixContainer<Cradle> {
  return createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });
}

export {
  asClass,
  asFunction,
  asValue,
  Lifetime,
  type AwilixContainer,
} from "awilix";
