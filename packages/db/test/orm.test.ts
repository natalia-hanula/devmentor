import { describe, expect, it } from "vitest";
import { initOrm, User } from "../src";

describe("initOrm", () => {
  // MikroORM 7 łączy się leniwie, więc inicjalizacja i `create` nie dotykają sieci; adres jest tylko konfiguracją.
  it("odkrywa wszystkie encje bez łączenia z bazą", async () => {
    const orm = await initOrm("postgresql://devmentor:devmentor@127.0.0.1:5432/devmentor");
    try {
      expect([...orm.getMetadata().getAll().values()].map((meta) => meta.className).sort()).toEqual([
        "MentorInvitation",
        "Technology",
        "User",
        "UserRole",
        "UserToken",
      ]);

      const user = orm.em.fork().create(User, {
        email: "a@example.com",
        displayName: "A",
        passwordHash: null,
        emailVerifiedAt: null,
      });

      expect(user.email).toBe("a@example.com");
    } finally {
      await orm.close(true);
    }
  });
});
