import type { MailMessage } from "../mail/mail.port";
import { EMAIL_VERIFICATION_TTL_MS } from "./user-token.service";

const HOUR_MS = 60 * 60 * 1000;

/** Ścieżka strony potwierdzenia — token dokleja `verificationLink` we fragmencie (`#token=`). */
export const VERIFY_EMAIL_PATH = "/verify-email";
export const VERIFICATION_MAIL_SUBJECT = "Potwierdź adres e-mail";

/**
 * Link weryfikacyjny z tokenem **we fragmencie URL**, nigdy w query: fragment nie trafia do serwera, więc nie
 * ląduje w logach Next ani reverse proxy, ani w nagłówku `Referer` (spec E01, „Tokeny w linkach”).
 */
export function verificationLink(appBaseUrl: string, rawToken: string): string {
  const url = new URL(VERIFY_EMAIL_PATH, appBaseUrl);
  url.hash = new URLSearchParams({ token: rawToken }).toString();
  return url.toString();
}

/** Wiadomość z linkiem weryfikacyjnym (tekst, neutralna płciowo — L18). */
export function verificationMail({ to, appBaseUrl, rawToken }: { to: string; appBaseUrl: string; rawToken: string }): MailMessage {
  const validHours = EMAIL_VERIFICATION_TTL_MS / HOUR_MS;
  return {
    to,
    subject: VERIFICATION_MAIL_SUBJECT,
    text: [
      "Potwierdź adres e-mail w DevMentor, otwierając link:",
      "",
      verificationLink(appBaseUrl, rawToken),
      "",
      `Link jest ważny ${validHours} h i działa jeden raz. Nowy link wyślesz ze strony konta.`,
      "",
      "Jeśli nie zakładasz konta w DevMentor, zignoruj tę wiadomość.",
    ].join("\n"),
  };
}
