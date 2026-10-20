import { UserRoleSchema } from "./auth/user-role.entity";
import { UserSchema } from "./auth/user.entity";
import { TechnologySchema } from "./mentors/technology.entity";

/**
 * Wszystkie encje aplikacji. Każdą nową encję (zdefiniowaną przez `defineEntity`)
 * dopisz tutaj — z tej listy korzysta zarówno aplikacja, jak i CLI migracji.
 */
export const entities = [TechnologySchema, UserSchema, UserRoleSchema];

export { Technology } from "./mentors/technology.entity";
export { User, UserSchema } from "./auth/user.entity";
export { UserRole, UserRoleSchema } from "./auth/user-role.entity";
