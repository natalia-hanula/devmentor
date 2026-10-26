import { EMAIL_VERIFICATION_TTL_MS, hashToken, UserTokenService } from "@devmentor/core";
import { initOrm, UserToken, type MikroORM, type User } from "@devmentor/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createAccount, deleteTestAccounts } from "./support/accounts";

const HOUR_MS = 60 * 60 * 1000;

describe("UserTokenService na prawdziwym PostgreSQL", () => {
  let orm: MikroORM;
  let user: User;
  const service = (now?: () => number) => new UserTokenService({ em: orm.em.fork() }, now);
  const tokenRows = (userId: string) => orm.em.fork().find(UserToken, { user: userId });

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  beforeEach(async () => {
    user = await createAccount(orm.em.fork(), { email: "token@example.com", roles: ["mentee"] });
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  it("wydany token zużywa się raz: pierwsze zużycie zwraca ID konta, drugie null", async () => {
    const raw = await service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);

    await expect(service().consume(raw, "email_verification")).resolves.toBe(user.id);
    await expect(service().consume(raw, "email_verification")).resolves.toBeNull();
    expect(await tokenRows(user.id)).toHaveLength(0);
  });

  it("w bazie jest tylko SHA-256 tokenu, nigdy surowa postać", async () => {
    const raw = await service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);

    const rows = await orm.em
      .fork()
      .getConnection()
      .execute<Record<string, unknown>[]>("select * from user_tokens where user_id = ?", [user.id]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.token_hash).toBe(hashToken(raw));
    expect(JSON.stringify(rows)).not.toContain(raw);
  });

  it("token po terminie ważności nie działa, a tuż przed nim działa", async () => {
    const issuedAt = Date.now();
    const raw = await service(() => issuedAt).issue(user.id, "email_verification", HOUR_MS);

    await expect(service(() => issuedAt + HOUR_MS).consume(raw, "email_verification")).resolves.toBeNull();
    await expect(service(() => issuedAt + HOUR_MS - 1).consume(raw, "email_verification")).resolves.toBe(user.id);
  });

  it("token innego celu nie działa i zostaje w bazie", async () => {
    const raw = await service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);

    await expect(service().consume(raw, "password_reset")).resolves.toBeNull();
    await expect(service().consume(raw, "email_verification")).resolves.toBe(user.id);
  });

  it("drugie wydanie tego samego celu unieważnia pierwszy token (upsert), inne cele zostają", async () => {
    const reset = await service().issue(user.id, "password_reset", HOUR_MS);
    const first = await service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);
    const second = await service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);

    expect(await tokenRows(user.id)).toHaveLength(2);
    await expect(service().consume(first, "email_verification")).resolves.toBeNull();
    await expect(service().consume(second, "email_verification")).resolves.toBe(user.id);
    await expect(service().consume(reset, "password_reset")).resolves.toBe(user.id);
  });

  it("dwa równoczesne wydania zostawiają jeden wiersz i działa dokładnie jeden z dwóch tokenów", async () => {
    const tokens = await Promise.all([
      service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS),
      service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS),
    ]);

    expect(await tokenRows(user.id)).toHaveLength(1);
    const results = await Promise.all(tokens.map((raw) => service().consume(raw, "email_verification")));
    expect(results.filter((result) => result === user.id)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
  });

  it("dwa równoczesne zużycia tego samego tokenu: dokładnie jedno udane", async () => {
    const raw = await service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);

    const results = await Promise.all([
      service().consume(raw, "email_verification"),
      service().consume(raw, "email_verification"),
    ]);

    expect(results.filter((result) => result === user.id)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
  });

  it("deleteAllForUser usuwa wszystkie tokeny konta i nie rusza cudzych", async () => {
    const other = await createAccount(orm.em.fork(), { email: "token-inny@example.com", roles: ["mentee"] });
    const verification = await service().issue(user.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);
    const reset = await service().issue(user.id, "password_reset", HOUR_MS);
    const othersToken = await service().issue(other.id, "email_verification", EMAIL_VERIFICATION_TTL_MS);

    await service().deleteAllForUser(user.id);

    expect(await tokenRows(user.id)).toHaveLength(0);
    await expect(service().consume(verification, "email_verification")).resolves.toBeNull();
    await expect(service().consume(reset, "password_reset")).resolves.toBeNull();
    await expect(service().consume(othersToken, "email_verification")).resolves.toBe(other.id);
  });
});
