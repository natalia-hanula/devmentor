import { describe, expect, it } from "vitest";
import {
  INVITATION_MAIL_SUBJECT,
  INVITE_PATH,
  invitationLink,
  invitationMail,
  VERIFICATION_MAIL_SUBJECT,
  VERIFY_EMAIL_PATH,
  verificationLink,
  verificationMail,
} from "../src";

const TOKEN = "AbC_def-123";

describe("verificationLink", () => {
  it("token tylko we fragmencie URL, nigdy w query", () => {
    const link = new URL(verificationLink("https://devmentor.example", TOKEN));

    expect(link.origin).toBe("https://devmentor.example");
    expect(link.pathname).toBe(VERIFY_EMAIL_PATH);
    expect(link.search).toBe("");
    expect(link.hash).toBe(`#token=${TOKEN}`);
    expect(new URLSearchParams(link.hash.slice(1)).get("token")).toBe(TOKEN);
  });

  it("ścieżka z APP_BASE_URL (także z ukośnikiem na końcu) nie dubluje się", () => {
    expect(verificationLink("http://localhost:3000/", TOKEN)).toBe(`http://localhost:3000/verify-email#token=${TOKEN}`);
  });
});

describe("verificationMail", () => {
  it("temat, adresat i treść z linkiem oraz ważnością 24 h — po polsku, neutralnie", () => {
    const message = verificationMail({ to: "ola@example.com", appBaseUrl: "https://devmentor.example", rawToken: TOKEN });

    expect(message.to).toBe("ola@example.com");
    expect(message.subject).toBe(VERIFICATION_MAIL_SUBJECT);
    expect(VERIFICATION_MAIL_SUBJECT).toBe("Potwierdź adres e-mail");
    expect(message.text).toBe(
      [
        "Potwierdź adres e-mail w DevMentor, otwierając link:",
        "",
        `https://devmentor.example/verify-email#token=${TOKEN}`,
        "",
        "Link jest ważny 24 h i działa jeden raz. Nowy link wyślesz ze strony konta.",
        "",
        "Jeśli nie zakładasz konta w DevMentor, zignoruj tę wiadomość.",
      ].join("\n"),
    );
    expect(message.text).not.toContain("?token");
  });
});

describe("invitationLink / invitationMail", () => {
  it("link zaproszenia: token tylko we fragmencie URL na ścieżce /invite", () => {
    const link = new URL(invitationLink("https://devmentor.example/", TOKEN));

    expect(link.pathname).toBe(INVITE_PATH);
    expect(link.search).toBe("");
    expect(link.hash).toBe(`#token=${TOKEN}`);
  });

  it("temat, adresat i treść z linkiem oraz ważnością w dniach — po polsku, neutralnie (L18)", () => {
    const message = invitationMail({ to: "adam@example.com", appBaseUrl: "https://devmentor.example", rawToken: TOKEN, validDays: 14 });

    expect(message.to).toBe("adam@example.com");
    expect(message.subject).toBe(INVITATION_MAIL_SUBJECT);
    expect(INVITATION_MAIL_SUBJECT).toBe("Zaproszenie do roli mentora w DevMentor");
    expect(message.text).toBe(
      [
        "Masz zaproszenie do roli mentora w DevMentor. Zaloguj się lub załóż konto, aby je przyjąć:",
        "",
        `https://devmentor.example/invite#token=${TOKEN}`,
        "",
        "Link jest ważny 14 dni i działa jeden raz.",
        "",
        "Jeśli to zaproszenie nie jest dla Ciebie, zignoruj tę wiadomość.",
      ].join("\n"),
    );
    expect(message.text).not.toContain("?token");
  });
});
