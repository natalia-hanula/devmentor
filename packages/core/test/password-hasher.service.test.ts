import bcrypt from "bcryptjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BCRYPT_COST, DUMMY_PASSWORD_HASH, PasswordHasher } from "../src";

const PASSWORD = "poprawne-haslo-123";

describe("PasswordHasher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hashuje bcryptem z kosztem 12 (prefiks $2…$12$, 60 znaków), za każdym razem z inną solą", async () => {
    const hasher = new PasswordHasher();

    const first = await hasher.hash(PASSWORD);
    const second = await hasher.hash(PASSWORD);

    expect(BCRYPT_COST).toBe(12);
    expect(first).toMatch(/^\$2[aby]\$12\$/);
    expect(first).toHaveLength(60);
    expect(bcrypt.getRounds(first)).toBe(BCRYPT_COST);
    expect(first).not.toBe(second);
    expect(first).not.toContain(PASSWORD);
  });

  it("verify: poprawne hasło → true, złe → false", async () => {
    const hasher = new PasswordHasher();
    const passwordHash = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, passwordHash)).resolves.toBe(true);
    await expect(hasher.verify("inne-haslo-123456", passwordHash)).resolves.toBe(false);
  });

  it("verify z null porównuje hasło z atrapą hasha i zawsze zwraca false", async () => {
    const compare = vi.spyOn(bcrypt, "compare");
    const hasher = new PasswordHasher();

    await expect(hasher.verify(PASSWORD, null)).resolves.toBe(false);

    expect(compare).toHaveBeenCalledOnce();
    expect(compare).toHaveBeenCalledWith(PASSWORD, DUMMY_PASSWORD_HASH);
  });

  it("verify z null zwraca false nawet wtedy, gdy porównanie z atrapą by się udało", async () => {
    vi.spyOn(bcrypt, "compare").mockImplementation(async () => true);

    await expect(new PasswordHasher().verify(PASSWORD, null)).resolves.toBe(false);
  });

  it("atrapa hasha to prawidłowy hash bcrypt o tym samym koszcie, więc porównanie trwa tyle samo", () => {
    expect(DUMMY_PASSWORD_HASH).toHaveLength(60);
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(BCRYPT_COST);
  });
});
