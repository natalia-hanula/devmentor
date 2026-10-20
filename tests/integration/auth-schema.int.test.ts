import { initOrm, UniqueConstraintViolationException, User, UserRole, type MikroORM } from "@devmentor/db";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { CONNECT_TIMEOUT_MS, MAINTENANCE_DATABASE } from "../../scripts/setup/steps/database.ts";
import { connect } from "../../scripts/setup/system.ts";
import { createAccount, deleteTestAccounts } from "./support/accounts";
import { migrate, rollback } from "./support/database";

describe("schemat kont na prawdziwym PostgreSQL", () => {
  let orm: MikroORM;

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  it("zakłada konto z rolami, UUID i domyślną wersją sesji", async () => {
    const created = await createAccount(orm.em.fork(), { email: "ola@example.com", roles: ["mentee", "mentor"] });

    const user = await orm.em.fork().findOneOrFail(User, { id: created.id }, { populate: ["roles"] });
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.sessionVersion).toBe(1);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.roles.getItems().map((r) => r.role).sort()).toEqual(["mentee", "mentor"]);
  });

  it("konto bez potwierdzonego adresu ma emailVerifiedAt = null", async () => {
    const created = await createAccount(orm.em.fork(), {
      email: "bez-potwierdzenia@example.com",
      roles: ["mentee"],
      emailVerified: false,
    });

    const user = await orm.em.fork().findOneOrFail(User, { id: created.id });
    expect(user.emailVerifiedAt).toBeNull();
  });

  it("UNIQUE na email: równoczesne założenie dwóch kont z tym samym adresem daje jeden sukces", async () => {
    const results = await Promise.allSettled([
      createAccount(orm.em.fork(), { email: "dubel@example.com", roles: ["mentee"] }),
      createAccount(orm.em.fork(), { email: "dubel@example.com", roles: ["mentee"] }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(UniqueConstraintViolationException);
  });

  it("UNIQUE (user_id, role): ta sama rola nie może być nadana dwa razy", async () => {
    const user = await createAccount(orm.em.fork(), { email: "rola@example.com", roles: ["mentee"] });

    const em = orm.em.fork();
    em.create(UserRole, { user: em.getReference(User, user.id), role: "mentee" });

    await expect(em.flush()).rejects.toBeInstanceOf(UniqueConstraintViolationException);
  });

  it("usunięcie konta kasuje jego role (CASCADE), a usunięcie nadającego zeruje granted_by (SET NULL)", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "operator@example.com", roles: ["operator"] });
    const mentor = await createAccount(orm.em.fork(), {
      email: "mentor@example.com",
      roles: ["mentor"],
      grantedBy: operator,
    });

    await orm.em.fork().nativeDelete(User, { id: operator.id });
    const afterOperator = await orm.em.fork().findOneOrFail(UserRole, { user: mentor.id });
    expect(afterOperator.grantedBy).toBeNull();
    expect(await orm.em.fork().count(UserRole, { user: operator.id })).toBe(0);

    await orm.em.fork().nativeDelete(User, { id: mentor.id });
    expect(await orm.em.fork().count(UserRole, { user: mentor.id })).toBe(0);
  });

  it("baza odrzuca nieznaną rolę (CHECK)", async () => {
    const user = await createAccount(orm.em.fork(), { email: "check@example.com", roles: [] });

    await expect(
      orm.em.fork().execute(`insert into user_roles (id, created_at, updated_at, user_id, role)
        values (gen_random_uuid(), now(), now(), '${user.id}', 'admin')`),
    ).rejects.toThrow(/user_roles_role_check/);
  });
});

describe("migracja auth-users-and-roles: w górę i w dół", () => {
  // Osobna baza — cofanie migracji nie może ruszać bazy współdzielonej przez inne testy.
  const DATABASE = `it_migration_${Date.now()}`;
  let maintenance: Awaited<ReturnType<typeof connect>>;
  let databaseUrl: string;

  const tableExists = async (name: string) => {
    const client = await connect(databaseUrl, CONNECT_TIMEOUT_MS);
    try {
      const result = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
        [name],
      );
      return result.rowCount === 1;
    } finally {
      await client.end();
    }
  };

  beforeAll(async () => {
    const url = new URL(inject("databaseUrl"));
    url.pathname = `/${MAINTENANCE_DATABASE}`;
    maintenance = await connect(url.href, CONNECT_TIMEOUT_MS);
    await maintenance.query(`CREATE DATABASE ${maintenance.escapeIdentifier(DATABASE)}`);
    url.pathname = `/${DATABASE}`;
    databaseUrl = url.href;
  });

  afterAll(async () => {
    // `migration:up/down` zapisuje snapshot per baza — plik tymczasowej bazy nie ma trafić do repo.
    rmSync(resolve(import.meta.dirname, `../../packages/db/migrations/.snapshot-${DATABASE}.json`), { force: true });
    if (!maintenance) return;
    await maintenance.query(`DROP DATABASE IF EXISTS ${maintenance.escapeIdentifier(DATABASE)}`);
    await maintenance.end();
  });

  it("migracja tworzy users i user_roles, a cofnięcie usuwa tylko je", async () => {
    await migrate(databaseUrl);
    expect([await tableExists("users"), await tableExists("user_roles"), await tableExists("technologies")]).toEqual([
      true,
      true,
      true,
    ]);

    await rollback(databaseUrl);
    expect([await tableExists("users"), await tableExists("user_roles"), await tableExists("technologies")]).toEqual([
      false,
      false,
      true,
    ]);

    await migrate(databaseUrl);
    expect([await tableExists("users"), await tableExists("user_roles")]).toEqual([true, true]);
  });
});
