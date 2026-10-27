import { defineEntity, p } from "@mikro-orm/postgresql";
import { TOKEN_HASH_LENGTH, USER_TOKEN_PURPOSES } from "../../constants";
import { baseProperties, pinEntityName } from "../base.entity";
import { UserSchema } from "./user.entity";

/** Jednorazowy token (weryfikacja e-maila, reset hasła). Zużyty token jest usuwany — bez `used_at`. */
const UserTokenSchema = defineEntity({
  name: "UserToken",
  tableName: "user_tokens",
  properties: {
    ...baseProperties,
    user: () => p.manyToOne(UserSchema).deleteRule("cascade"),
    purpose: p.enum(USER_TOKEN_PURPOSES),
    /** SHA-256 (hex) surowego tokenu; surowy token nigdy nie trafia do bazy ani logów. */
    tokenHash: p.type("character").length(TOKEN_HASH_LENGTH).unique().hidden(),
    expiresAt: p.datetime(),
  },
  // Najwyżej jeden żywy token danego celu na konto: nowy token to upsert po tym constraincie.
  uniques: [{ properties: ["user", "purpose"] }],
});

export class UserToken extends UserTokenSchema.class {}
pinEntityName(UserToken, "UserToken");
UserTokenSchema.setClass(UserToken);

export { UserTokenSchema };
