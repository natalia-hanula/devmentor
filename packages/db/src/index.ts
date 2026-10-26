export { createOrmConfig, requireDatabaseUrl, type OrmConfigInput } from "./config";
export { initOrm } from "./orm";
export { isDatabaseUnavailableError } from "./errors";
export { entities, Technology, User, UserRole, UserToken } from "./entities";
export * from "./constants";
// `core` korzysta z ORM wyłącznie przez te re-eksporty — tylko `db` importuje `@mikro-orm/*`.
export {
  UniqueConstraintViolationException,
  type EntityManager,
  type MikroORM,
} from "@mikro-orm/postgresql";
