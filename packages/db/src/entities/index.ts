import { TechnologySchema } from "./mentors/technology.entity";

/**
 * Wszystkie encje aplikacji. Każdą nową encję (zdefiniowaną przez `defineEntity`)
 * dopisz tutaj — z tej listy korzysta zarówno aplikacja, jak i CLI migracji.
 */
export const entities = [TechnologySchema];

export { Technology } from "./mentors/technology.entity";
