import { createHash } from "node:crypto";
import { UserToken } from "@devmentor/db";
import { describe, expect, it } from "vitest";
import { EMAIL_VERIFICATION_TTL_MS, generateRawToken, hashToken, UserTokenService } from "../src";
import { createFakeEntityManager, createFakeQueryBuilder } from "./fake-entity-manager";

const USER_ID = "0b0e5a8e-6a43-4c1a-9f0e-6f2f9b1c7d11";
const NOW = Date.parse("2026-10-26T12:00:00.000Z");
const clock = () => NOW;

describe("generateRawToken / hashToken", () => {
  it("token to 32 losowe bajty w base64url (43 znaki), za każdym razem inny", () => {
    const first = generateRawToken();
    const second = generateRawToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first, "base64url")).toHaveLength(32);
    expect(first).not.toBe(second);
  });

  it("hash to SHA-256 surowego tokenu jako hex (64 znaki)", () => {
    const raw = generateRawToken();

    expect(hashToken(raw)).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(hashToken(raw)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("EMAIL_VERIFICATION_TTL_MS", () => {
  it("wynosi 24 h", () => {
    expect(EMAIL_VERIFICATION_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe("UserTokenService", () => {
  it("issue zapisuje upsertem po (user, purpose) tylko hash i termin ważności, a zwraca surowy token", async () => {
    const { fake, em } = createFakeEntityManager();
    const service = new UserTokenService({ em }, clock);

    const raw = await service.issue(USER_ID, "email_verification", EMAIL_VERIFICATION_TTL_MS);

    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(fake.upsert).toHaveBeenCalledWith(
      UserToken,
      {
        user: USER_ID,
        purpose: "email_verification",
        tokenHash: hashToken(raw),
        expiresAt: new Date(NOW + EMAIL_VERIFICATION_TTL_MS),
        updatedAt: new Date(NOW),
      },
      {
        onConflictFields: ["user", "purpose"],
        onConflictAction: "merge",
        onConflictMergeFields: ["tokenHash", "expiresAt", "updatedAt"],
      },
    );
    expect(JSON.stringify(fake.upsert.mock.calls)).not.toContain(raw);
  });

  it("consume usuwa ważny token po hashu i celu (DELETE … RETURNING user_id) i zwraca ID konta", async () => {
    const { fake, em } = createFakeEntityManager();
    const { qb, nativeQuery } = createFakeQueryBuilder();
    fake.createQueryBuilder.mockReturnValue(qb);
    fake.execute.mockResolvedValue([{ user_id: USER_ID }]);
    const service = new UserTokenService({ em }, clock);

    await expect(service.consume("surowy-token", "email_verification")).resolves.toBe(USER_ID);

    expect(fake.createQueryBuilder).toHaveBeenCalledWith(UserToken);
    expect(qb.delete).toHaveBeenCalledWith({
      tokenHash: hashToken("surowy-token"),
      purpose: "email_verification",
      expiresAt: { $gt: new Date(NOW) },
    });
    expect(nativeQuery.returning).toHaveBeenCalledWith(["user_id"]);
    expect(fake.execute).toHaveBeenCalledWith(nativeQuery);
  });

  it("consume zwraca null, gdy żaden wiersz nie pasuje (zużyty, wygasły, obcy cel, nieznany)", async () => {
    const { fake, em } = createFakeEntityManager();
    fake.execute.mockResolvedValue([]);

    await expect(new UserTokenService({ em }, clock).consume("x", "password_reset")).resolves.toBeNull();
  });

  it("domyślnie liczy czas zegarem systemowym", async () => {
    const { fake, em } = createFakeEntityManager();
    const before = Date.now();

    await new UserTokenService({ em }).issue(USER_ID, "email_verification", 1000);

    const [, data] = fake.upsert.mock.calls[0] as unknown as [unknown, { expiresAt: Date }];
    expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 1000);
    expect(data.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("deleteAllForUser usuwa wszystkie tokeny konta", async () => {
    const { fake, em } = createFakeEntityManager();

    await new UserTokenService({ em }).deleteAllForUser(USER_ID);

    expect(fake.nativeDelete).toHaveBeenCalledWith(UserToken, { user: USER_ID });
  });
});
