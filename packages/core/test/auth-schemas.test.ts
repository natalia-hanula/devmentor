import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH } from "@devmentor/db/constants";
import { describe, expect, it } from "vitest";
import { emailSchema, normalizeEmail } from "../src/validators/auth/email.schema";
import { invitationCreateSchema } from "../src/validators/auth/invitation-create.schema";
import { loginSchema } from "../src/validators/auth/login.schema";
import { registerSchema } from "../src/validators/auth/register.schema";
import { INVALID_LINK_MESSAGE, TOKEN_MAX_LENGTH, tokenConfirmSchema } from "../src/validators/auth/token-confirm.schema";

const VALID = { email: "ola@example.com", password: "dlugie-haslo-123", displayName: "Ola" };

function fieldMessages(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const messages: Record<string, string[]> = {};
  for (const issue of result.error?.issues ?? []) {
    (messages[issue.path.join(".")] ??= []).push(issue.message);
  }
  return messages;
}

describe("emailSchema / normalizeEmail", () => {
  it("przycina spacje i zamienia na małe litery", () => {
    expect(emailSchema.parse("  Ola.Nowak@Example.COM ")).toBe("ola.nowak@example.com");
    expect(normalizeEmail("  A@X.pl ")).toBe("a@x.pl");
  });

  it("pusty lub brakujący adres → jeden komunikat „Podaj adres e-mail”", () => {
    expect(emailSchema.safeParse("   ").error?.issues.map((issue) => issue.message)).toEqual(["Podaj adres e-mail"]);
    expect(emailSchema.safeParse(undefined).error?.issues.map((issue) => issue.message)).toEqual(["Podaj adres e-mail"]);
  });

  it("zły format → podpowiedź z przykładem", () => {
    expect(emailSchema.safeParse("ola-at-example").error?.issues.map((issue) => issue.message)).toEqual([
      "Podaj poprawny adres e-mail, np. ola@example.com",
    ]);
  });

  it("za długi adres → tylko komunikat o długości (limit kolumny)", () => {
    const tooLong = `${"a".repeat(EMAIL_MAX_LENGTH - "@x.pl".length + 1)}@x.pl`;

    expect(emailSchema.safeParse(tooLong).error?.issues.map((issue) => issue.message)).toEqual([
      `Adres e-mail może mieć najwyżej ${EMAIL_MAX_LENGTH} znaki`,
    ]);
  });
});

describe("registerSchema", () => {
  it("normalizuje e-mail, przycina nazwę, hasła nie zmienia; pomija pola spoza schematu", () => {
    const parsed = registerSchema.parse({
      email: " Ola@Example.com",
      password: "  spacje-sa-czescia-hasla ",
      displayName: "  Ola  ",
      roles: ["operator"],
      emailVerified: true,
    });

    expect(parsed).toEqual({ email: "ola@example.com", password: "  spacje-sa-czescia-hasla ", displayName: "Ola" });
  });

  it("hasło: 11 znaków odrzucone, 12 przyjęte", () => {
    expect(fieldMessages(registerSchema.safeParse({ ...VALID, password: "a".repeat(11) }))).toEqual({
      password: ["Hasło musi mieć co najmniej 12 znaków"],
    });
    expect(registerSchema.safeParse({ ...VALID, password: "a".repeat(12) }).success).toBe(true);
  });

  it("hasło: znaki liczone jako punkty kodowe — 12 emoji to 12 znaków (i 48 bajtów)", () => {
    expect(registerSchema.safeParse({ ...VALID, password: "🔑".repeat(12) }).success).toBe(true);
    // 11 emoji ma 22 jednostki UTF-16 — `String.length` przepuściłby je jako „22 znaki”.
    expect(fieldMessages(registerSchema.safeParse({ ...VALID, password: "🔑".repeat(11) })).password).toEqual([
      "Hasło musi mieć co najmniej 12 znaków",
    ]);
  });

  it("hasło: 72 bajty UTF-8 przyjęte, 73 odrzucone przy polu password — także 12+ znaków z emoji", () => {
    expect(registerSchema.safeParse({ ...VALID, password: "a".repeat(72) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...VALID, password: "🔑".repeat(18) }).success).toBe(true);

    const tooLongMessage = "Hasło jest za długie — skróć je. Emoji i litery spoza alfabetu łacińskiego zajmują więcej miejsca.";
    expect(fieldMessages(registerSchema.safeParse({ ...VALID, password: "a".repeat(73) }))).toEqual({
      password: [tooLongMessage],
    });
    // 19 emoji po 4 bajty = 76 bajtów przy zaledwie 19 znakach.
    expect(fieldMessages(registerSchema.safeParse({ ...VALID, password: "🔑".repeat(19) }))).toEqual({
      password: [tooLongMessage],
    });
  });

  it("brak hasła → „Podaj hasło”", () => {
    expect(fieldMessages(registerSchema.safeParse({ email: VALID.email, displayName: "Ola" })).password).toEqual([
      "Podaj hasło",
    ]);
  });

  it("nazwa: pusta (także z samych spacji) i brakująca odrzucone", () => {
    expect(fieldMessages(registerSchema.safeParse({ ...VALID, displayName: "   " }))).toEqual({
      displayName: ["Podaj wyświetlaną nazwę"],
    });
    expect(fieldMessages(registerSchema.safeParse({ email: VALID.email, password: VALID.password })).displayName).toEqual([
      "Podaj wyświetlaną nazwę",
    ]);
  });

  it("nazwa: limit kolumny przyjęty, o znak dłuższa odrzucona", () => {
    expect(registerSchema.safeParse({ ...VALID, displayName: "x".repeat(DISPLAY_NAME_MAX_LENGTH) }).success).toBe(true);
    expect(fieldMessages(registerSchema.safeParse({ ...VALID, displayName: "x".repeat(DISPLAY_NAME_MAX_LENGTH + 1) }))).toEqual({
      displayName: [`Nazwa może mieć najwyżej ${DISPLAY_NAME_MAX_LENGTH} znaków`],
    });
  });
});

describe("loginSchema", () => {
  it("normalizuje e-mail i przyjmuje niepuste hasło (bez minimalnej długości z rejestracji)", () => {
    expect(loginSchema.parse({ email: " Ola@Example.com ", password: "x" })).toEqual({ email: "ola@example.com", password: "x" });
    expect(loginSchema.safeParse({ email: VALID.email, password: "a".repeat(72) }).success).toBe(true);
  });

  it("hasło do 72 bajtów UTF-8 przechodzi, dłuższe (jak w rejestracji) → „Hasło jest za długie”", () => {
    expect(loginSchema.safeParse({ email: VALID.email, password: "a".repeat(72) }).success).toBe(true);
    expect(loginSchema.safeParse({ email: VALID.email, password: "ą".repeat(36) }).success).toBe(true);
    expect(fieldMessages(loginSchema.safeParse({ email: VALID.email, password: "a".repeat(73) }))).toEqual({
      password: ["Hasło jest za długie"],
    });
    expect(fieldMessages(loginSchema.safeParse({ email: VALID.email, password: "ą".repeat(37) }))).toEqual({
      password: ["Hasło jest za długie"],
    });
    expect(loginSchema.safeParse({ email: VALID.email, password: "x".repeat(2_000_000) }).success).toBe(false);
  });

  it("puste lub brakujące hasło → „Podaj hasło”", () => {
    expect(fieldMessages(loginSchema.safeParse({ email: VALID.email, password: "" }))).toEqual({ password: ["Podaj hasło"] });
    expect(fieldMessages(loginSchema.safeParse({ email: VALID.email }))).toEqual({ password: ["Podaj hasło"] });
  });
});

describe("tokenConfirmSchema", () => {
  it("przyjmuje token i zwraca tylko pole token", () => {
    const token = "a".repeat(43);

    expect(tokenConfirmSchema.parse({ token, extra: "x" })).toEqual({ token });
    expect(tokenConfirmSchema.safeParse({ token: "a".repeat(TOKEN_MAX_LENGTH) }).success).toBe(true);
  });

  it.each([
    ["brak tokenu", {}],
    ["token nie jest napisem", { token: 123 }],
    ["pusty token", { token: "" }],
    ["za długi token", { token: "a".repeat(TOKEN_MAX_LENGTH + 1) }],
  ])("%s → jeden komunikat „Link jest nieważny albo wygasł”", (_case, input) => {
    const result = tokenConfirmSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([INVALID_LINK_MESSAGE]);
    expect(INVALID_LINK_MESSAGE).toBe("Link jest nieważny albo wygasł");
  });
});

describe("invitationCreateSchema", () => {
  it("normalizuje e-mail (trim + małe litery) i zwraca tylko pole email", () => {
    expect(invitationCreateSchema.parse({ email: "  Adam.Nowy@Example.COM ", extra: "x" })).toEqual({ email: "adam.nowy@example.com" });
  });

  it.each([[{}], [{ email: "" }], [{ email: "nie-adres" }]])("odrzuca %j z błędem przy polu email", (input) => {
    expect(Object.keys(fieldMessages(invitationCreateSchema.safeParse(input)))).toEqual(["email"]);
  });
});
