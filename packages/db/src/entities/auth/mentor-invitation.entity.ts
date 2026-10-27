import { defineEntity, p } from "@mikro-orm/postgresql";
import { EMAIL_MAX_LENGTH, TOKEN_HASH_LENGTH } from "../../constants";
import { baseProperties, pinEntityName } from "../base.entity";
import { UserSchema } from "./user.entity";

/**
 * Zaproszenie do roli mentora. Status (`accepted` > `revoked` > `expired` > `pending`) jest liczony z
 * `acceptedAt`, `revokedAt` i `expiresAt`, nie przechowywany. Token na okaziciela (Q15): zaproszony może
 * przyjąć je kontem z innym adresem, dlatego `acceptedBy` zapisuje, kto to zrobił.
 */
const MentorInvitationSchema = defineEntity({
  name: "MentorInvitation",
  tableName: "mentor_invitations",
  /**
   * Najwyżej jedno nieprzyjęte i niecofnięte zaproszenie na adres — pilnuje tego baza, nie check-then-write.
   * Indeks częściowy: MikroORM porównuje go w migracjach tylko po nazwie.
   */
  uniques: [
    {
      name: "mentor_invitations_email_active_unique",
      expression:
        'create unique index "mentor_invitations_email_active_unique" on "mentor_invitations" ("email") where "accepted_at" is null and "revoked_at" is null',
    },
  ],
  properties: {
    ...baseProperties,
    /** Adresat, znormalizowany (`trim` + małe litery). */
    email: p.string().length(EMAIL_MAX_LENGTH),
    /** SHA-256 (hex) surowego tokenu; surowy token nigdy nie trafia do bazy ani logów. */
    tokenHash: p.type("character").length(TOKEN_HASH_LENGTH).unique().hidden(),
    expiresAt: p.datetime(),
    /** Operator, który utworzył zaproszenie; `null` po usunięciu jego konta. */
    createdBy: () => p.manyToOne(UserSchema).nullable().deleteRule("set null"),
    revokedAt: p.datetime().nullable(),
    acceptedAt: p.datetime().nullable(),
    acceptedBy: () => p.manyToOne(UserSchema).nullable().deleteRule("set null"),
  },
});

export class MentorInvitation extends MentorInvitationSchema.class {}
pinEntityName(MentorInvitation, "MentorInvitation");
MentorInvitationSchema.setClass(MentorInvitation);

export { MentorInvitationSchema };
