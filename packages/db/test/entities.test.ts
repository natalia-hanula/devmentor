import { describe, expect, it } from "vitest";
import { entities, MentorInvitation, Technology, User, UserRole, UserToken } from "../src";
import { MentorInvitationSchema } from "../src/entities/auth/mentor-invitation.entity";
import { UserTokenSchema } from "../src/entities/auth/user-token.entity";
import { pinEntityName } from "../src/entities/base.entity";
import { TechnologySchema } from "../src/entities/mentors/technology.entity";

type Hook = (entity: unknown, em: unknown) => unknown;

function hook(property: string, kind: "onCreate" | "onUpdate"): Hook {
  const meta = TechnologySchema.meta.properties as unknown as Record<string, Record<string, Hook>>;
  return meta[property][kind];
}

describe("pinEntityName", () => {
  it("przypina nazwę klasy, także gdy bundler ją zminifikował", () => {
    class j {}
    expect(j.name).toBe("j");

    pinEntityName(j, "User");

    expect(j.name).toBe("User");
  });

  it("klasy encji mają nazwy z defineEntity, niezależnie od minifikacji", () => {
    expect([Technology.name, User.name, UserRole.name, UserToken.name, MentorInvitation.name]).toEqual([
      "Technology",
      "User",
      "UserRole",
      "UserToken",
      "MentorInvitation",
    ]);
  });
});

describe("encje", () => {
  it("rejestruje Technology w liście encji, w tabeli technologies", () => {
    expect(entities).toContain(TechnologySchema);
    expect(TechnologySchema.meta.tableName).toBe("technologies");
    expect(TechnologySchema.meta.class).toBe(Technology);
  });

  it("rejestruje UserToken w liście encji, w tabeli user_tokens", () => {
    expect(entities).toContain(UserTokenSchema);
    expect(UserTokenSchema.meta.tableName).toBe("user_tokens");
    expect(UserTokenSchema.meta.class).toBe(UserToken);
  });

  it("rejestruje MentorInvitation w liście encji, w tabeli mentor_invitations", () => {
    expect(entities).toContain(MentorInvitationSchema);
    expect(MentorInvitationSchema.meta.tableName).toBe("mentor_invitations");
    expect(MentorInvitationSchema.meta.class).toBe(MentorInvitation);
  });

  it("baseProperties generują UUID i znaczniki czasu przy tworzeniu oraz odświeżają updatedAt", () => {
    const id = hook("id", "onCreate")({}, {});
    const createdAt = hook("createdAt", "onCreate")({}, {});
    const updatedAtOnCreate = hook("updatedAt", "onCreate")({}, {});
    const updatedAtOnUpdate = hook("updatedAt", "onUpdate")({}, {});

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAtOnCreate).toBeInstanceOf(Date);
    expect(updatedAtOnUpdate).toBeInstanceOf(Date);
  });
});
