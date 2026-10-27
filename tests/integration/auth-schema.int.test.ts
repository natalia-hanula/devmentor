import {
  initOrm,
  MentorInvitation,
  UniqueConstraintViolationException,
  User,
  UserRole,
  UserToken,
  type EntityManager,
  type MikroORM,
} from "@devmentor/db";
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

  it("UNIQUE na lower(email): adres różniący się tylko wielkością liter jest odrzucany", async () => {
    await createAccount(orm.em.fork(), { email: "Wielkie@Example.pl", roles: ["mentee"] });

    await expect(
      createAccount(orm.em.fork(), { email: "wielkie@example.pl", roles: ["mentee"] }),
    ).rejects.toBeInstanceOf(UniqueConstraintViolationException);
    expect(await orm.em.fork().count(User, { email: { $ilike: "it-wielkie@example.pl" } })).toBe(1);
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

describe("hasła i tokeny kont (auth-credentials) na prawdziwym PostgreSQL", () => {
  let orm: MikroORM;
  const HOUR_MS = 60 * 60 * 1000;
  const hash = (char: string) => char.repeat(64);

  const addToken = async (
    em: EntityManager,
    user: User,
    purpose: UserToken["purpose"],
    tokenHash: string,
  ): Promise<void> => {
    em.create(UserToken, {
      user: em.getReference(User, user.id),
      purpose,
      tokenHash,
      expiresAt: new Date(Date.now() + HOUR_MS),
    });
    await em.flush();
  };

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  it("password_hash: NULL dozwolony, hash bcrypt (60 znaków) zapisuje się i nie trafia do serializacji encji", async () => {
    const created = await createAccount(orm.em.fork(), { email: "haslo@example.com", roles: ["mentee"] });
    expect((await orm.em.fork().findOneOrFail(User, { id: created.id })).passwordHash).toBeNull();

    const bcryptHash = `$2b$12$${"x".repeat(53)}`;
    await orm.em.fork().nativeUpdate(User, { id: created.id }, { passwordHash: bcryptHash });

    const user = await orm.em.fork().findOneOrFail(User, { id: created.id });
    expect(user.passwordHash).toBe(bcryptHash);
    expect(JSON.stringify(user)).not.toContain(bcryptHash);
  });

  it("zapisuje token z celem i datą wygaśnięcia; token_hash nie trafia do serializacji encji", async () => {
    const user = await createAccount(orm.em.fork(), { email: "token@example.com", roles: ["mentee"] });
    await addToken(orm.em.fork(), user, "email_verification", hash("a"));

    const token = await orm.em.fork().findOneOrFail(UserToken, { user: user.id });
    expect(token.purpose).toBe("email_verification");
    expect(token.tokenHash).toBe(hash("a"));
    expect(token.expiresAt).toBeInstanceOf(Date);
    expect(JSON.stringify(token)).not.toContain(hash("a"));
  });

  it("UNIQUE na token_hash: ten sam hash nie może należeć do dwóch tokenów", async () => {
    const first = await createAccount(orm.em.fork(), { email: "pierwszy@example.com", roles: ["mentee"] });
    const second = await createAccount(orm.em.fork(), { email: "drugi@example.com", roles: ["mentee"] });
    await addToken(orm.em.fork(), first, "email_verification", hash("b"));

    await expect(addToken(orm.em.fork(), second, "email_verification", hash("b"))).rejects.toBeInstanceOf(
      UniqueConstraintViolationException,
    );
  });

  it("UNIQUE (user_id, purpose): drugi token tego samego celu jest odrzucany, innego celu — przyjmowany", async () => {
    const user = await createAccount(orm.em.fork(), { email: "cel@example.com", roles: ["mentee"] });
    await addToken(orm.em.fork(), user, "email_verification", hash("c"));

    await expect(addToken(orm.em.fork(), user, "email_verification", hash("d"))).rejects.toBeInstanceOf(
      UniqueConstraintViolationException,
    );
    await addToken(orm.em.fork(), user, "password_reset", hash("e"));
    expect(await orm.em.fork().count(UserToken, { user: user.id })).toBe(2);
  });

  it("usunięcie konta kasuje jego tokeny (CASCADE)", async () => {
    const user = await createAccount(orm.em.fork(), { email: "kaskada@example.com", roles: ["mentee"] });
    await addToken(orm.em.fork(), user, "email_verification", hash("f"));
    await addToken(orm.em.fork(), user, "password_reset", hash("0"));

    await orm.em.fork().nativeDelete(User, { id: user.id });

    expect(await orm.em.fork().count(UserToken, { user: user.id })).toBe(0);
  });

  it("baza odrzuca nieznany cel tokenu (CHECK)", async () => {
    const user = await createAccount(orm.em.fork(), { email: "cel-check@example.com", roles: ["mentee"] });

    await expect(
      orm.em.fork().execute(
        `insert into user_tokens (id, created_at, updated_at, user_id, purpose, token_hash, expires_at)
          values (gen_random_uuid(), now(), now(), ?, 'login', ?, now())`,
        [user.id, hash("1")],
      ),
    ).rejects.toThrow(/user_tokens_purpose_check/);
  });
});

describe("zaproszenia mentorów (auth-mentor-invitations) na prawdziwym PostgreSQL", () => {
  let orm: MikroORM;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const hash = (char: string) => char.repeat(64);

  const invite = async (
    email: string,
    tokenHash: string,
    overrides: Partial<Pick<MentorInvitation, "revokedAt" | "acceptedAt">> = {},
    createdBy?: User,
  ): Promise<MentorInvitation> => {
    const em = orm.em.fork();
    const invitation = em.create(MentorInvitation, {
      email: `it-${email}`,
      tokenHash,
      expiresAt: new Date(Date.now() + 14 * DAY_MS),
      createdBy: createdBy ? em.getReference(User, createdBy.id) : null,
      ...overrides,
    });
    await em.flush();
    return invitation;
  };

  beforeAll(async () => {
    orm = await initOrm(inject("databaseUrl"));
  });

  afterEach(async () => {
    await deleteTestAccounts(orm.em.fork());
  });

  afterAll(async () => {
    await orm.close(true);
  });

  it("zapisuje zaproszenie; token_hash nie trafia do serializacji encji", async () => {
    await invite("nowy@example.com", hash("a"));

    const stored = await orm.em.fork().findOneOrFail(MentorInvitation, { email: "it-nowy@example.com" });
    expect(stored.tokenHash).toBe(hash("a"));
    expect(stored.revokedAt).toBeNull();
    expect(stored.acceptedAt).toBeNull();
    expect(stored.createdBy).toBeNull();
    expect(JSON.stringify(stored)).not.toContain(hash("a"));
  });

  it("częściowy UNIQUE: drugie aktywne zaproszenie na ten adres jest odrzucane przez bazę", async () => {
    await invite("aktywne@example.com", hash("b"));

    await expect(invite("aktywne@example.com", hash("c"))).rejects.toBeInstanceOf(UniqueConstraintViolationException);
  });

  it("częściowy UNIQUE: dwa równoczesne zaproszenia na adres dają jeden sukces", async () => {
    const results = await Promise.allSettled([
      invite("wyscig@example.com", hash("d")),
      invite("wyscig@example.com", hash("e")),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("po cofnięciu albo przyjęciu zaproszenia adres może dostać nowe (indeks dotyczy tylko aktywnych)", async () => {
    await invite("cofniete@example.com", hash("f"), { revokedAt: new Date() });
    await invite("przyjete@example.com", hash("0"), { acceptedAt: new Date() });

    await invite("cofniete@example.com", hash("1"));
    await invite("przyjete@example.com", hash("2"));
    await expect(invite("cofniete@example.com", hash("3"))).rejects.toBeInstanceOf(UniqueConstraintViolationException);
    expect(await orm.em.fork().count(MentorInvitation, { email: "it-cofniete@example.com" })).toBe(2);
  });

  it("UNIQUE na token_hash: ten sam hash nie może należeć do dwóch zaproszeń", async () => {
    await invite("pierwszy@example.com", hash("4"));

    await expect(invite("drugi@example.com", hash("4"))).rejects.toBeInstanceOf(UniqueConstraintViolationException);
  });

  it("usunięcie operatora i przyjmującego zeruje created_by / accepted_by (SET NULL), zaproszenie zostaje", async () => {
    const operator = await createAccount(orm.em.fork(), { email: "zapraszajacy@example.com", roles: ["operator"] });
    const mentor = await createAccount(orm.em.fork(), { email: "przyjmujacy@example.com", roles: ["mentee"] });
    const created = await invite("fk@example.com", hash("5"), {}, operator);
    await orm.em.fork().nativeUpdate(MentorInvitation, { id: created.id }, { acceptedBy: mentor.id, acceptedAt: new Date() });

    await orm.em.fork().nativeDelete(User, { id: operator.id });
    await orm.em.fork().nativeDelete(User, { id: mentor.id });

    const stored = await orm.em.fork().findOneOrFail(MentorInvitation, { id: created.id });
    expect(stored.createdBy).toBeNull();
    expect(stored.acceptedBy).toBeNull();
    expect(stored.acceptedAt).toBeInstanceOf(Date);
  });
});

describe("migracje auth (users-and-roles, users-email-lower-unique, credentials, mentor-invitations): w górę i w dół", () => {
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

  const indexExists = async (name: string) => {
    const client = await connect(databaseUrl, CONNECT_TIMEOUT_MS);
    try {
      const result = await client.query("SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1", [name]);
      return result.rowCount === 1;
    } finally {
      await client.end();
    }
  };

  const columnExists = async (table: string, column: string) => {
    const client = await connect(databaseUrl, CONNECT_TIMEOUT_MS);
    try {
      const result = await client.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2",
        [table, column],
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

  it("migracje tworzą users, user_roles, indeks lower(email), user_tokens i mentor_invitations; cofanie usuwa po kolei tylko je", async () => {
    await migrate(databaseUrl);
    expect([await tableExists("users"), await tableExists("user_roles"), await tableExists("technologies")]).toEqual([
      true,
      true,
      true,
    ]);
    expect(await indexExists("users_email_lower_unique")).toBe(true);
    expect([await tableExists("user_tokens"), await columnExists("users", "password_hash")]).toEqual([true, true]);
    expect(await tableExists("mentor_invitations")).toBe(true);
    expect(await indexExists("mentor_invitations_email_active_unique")).toBe(true);

    await rollback(databaseUrl);
    expect(await tableExists("mentor_invitations")).toBe(false);
    expect([await tableExists("user_tokens"), await columnExists("users", "password_hash")]).toEqual([true, true]);

    await rollback(databaseUrl);
    expect([await tableExists("user_tokens"), await columnExists("users", "password_hash")]).toEqual([false, false]);
    expect(await indexExists("users_email_lower_unique")).toBe(true);

    await rollback(databaseUrl);
    expect(await indexExists("users_email_lower_unique")).toBe(false);
    expect(await indexExists("users_email_unique")).toBe(true);
    expect(await tableExists("users")).toBe(true);

    await rollback(databaseUrl);
    expect([await tableExists("users"), await tableExists("user_roles"), await tableExists("technologies")]).toEqual([
      false,
      false,
      true,
    ]);

    await migrate(databaseUrl);
    expect([await tableExists("users"), await tableExists("user_roles")]).toEqual([true, true]);
    expect(await indexExists("users_email_lower_unique")).toBe(true);
    expect([await tableExists("user_tokens"), await columnExists("users", "password_hash")]).toEqual([true, true]);
    expect(await tableExists("mentor_invitations")).toBe(true);
  });
});
