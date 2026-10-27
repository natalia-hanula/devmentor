import { defineEntity, p } from "@mikro-orm/postgresql";
import { USER_ROLES } from "../../constants";
import { baseProperties, pinEntityName } from "../base.entity";
import { UserSchema } from "./user.entity";

const UserRoleSchema = defineEntity({
  name: "UserRole",
  tableName: "user_roles",
  properties: {
    ...baseProperties,
    user: () => p.manyToOne(UserSchema).deleteRule("cascade"),
    role: p.enum(USER_ROLES),
    /** Operator, który nadał rolę (zaproszenie); `null` dla rejestracji i CLI. */
    grantedBy: () => p.manyToOne(UserSchema).nullable().deleteRule("set null"),
  },
  // Nadanie roli jest idempotentne pod constraintem, bez check-then-write.
  uniques: [{ properties: ["user", "role"] }],
});

export class UserRole extends UserRoleSchema.class {}
pinEntityName(UserRole, "UserRole");
UserRoleSchema.setClass(UserRole);

export { UserRoleSchema };
