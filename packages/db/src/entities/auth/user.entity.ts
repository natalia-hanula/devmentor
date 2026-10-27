import { defineEntity, p } from "@mikro-orm/postgresql";
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, PASSWORD_HASH_LENGTH } from "../../constants";
import { baseProperties, pinEntityName } from "../base.entity";
import { UserRoleSchema } from "./user-role.entity";

const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  /**
   * Unikalność adresu niezależna od wielkości liter — ostatnia linia obrony, gdyby zapis ominął
   * normalizację. Indeks wyrażeniowy: MikroORM porównuje go w migracjach tylko po nazwie.
   */
  uniques: [
    {
      name: "users_email_lower_unique",
      expression: 'create unique index "users_email_lower_unique" on "users" (lower("email"))',
    },
  ],
  properties: {
    ...baseProperties,
    /** Znormalizowany (`trim` + małe litery) w walidatorze i serwisie. */
    email: p.string().length(EMAIL_MAX_LENGTH).unique(),
    /** `null` = adres niepotwierdzony. */
    emailVerifiedAt: p.datetime().nullable(),
    displayName: p.string().length(DISPLAY_NAME_MAX_LENGTH),
    /** Hash bcrypt; `null` dla kont bez hasła. `hidden` — nie trafia do serializacji encji (DTO mają jawne pola). */
    passwordHash: p.string().length(PASSWORD_HASH_LENGTH).nullable().hidden(),
    /** Podbijane przy resecie hasła; unieważnia wszystkie wydane wcześniej tokeny sesji. */
    sessionVersion: p.integer().default(1),
    roles: () => p.oneToMany(UserRoleSchema).mappedBy("user"),
  },
});

export class User extends UserSchema.class {}
pinEntityName(User, "User");
UserSchema.setClass(User);

export { UserSchema };
