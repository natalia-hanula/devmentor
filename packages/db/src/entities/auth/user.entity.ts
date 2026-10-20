import { defineEntity, p } from "@mikro-orm/postgresql";
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH } from "../../constants";
import { baseProperties } from "../base.entity";
import { UserRoleSchema } from "./user-role.entity";

const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    ...baseProperties,
    /** Znormalizowany (`trim` + małe litery) w walidatorze i serwisie. */
    email: p.string().length(EMAIL_MAX_LENGTH).unique(),
    /** `null` = adres niepotwierdzony. */
    emailVerifiedAt: p.datetime().nullable(),
    displayName: p.string().length(DISPLAY_NAME_MAX_LENGTH),
    /** Podbijane przy resecie hasła; unieważnia wszystkie wydane wcześniej tokeny sesji. */
    sessionVersion: p.integer().default(1),
    roles: () => p.oneToMany(UserRoleSchema).mappedBy("user"),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);

export { UserSchema };
