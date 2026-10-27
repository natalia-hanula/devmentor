import { ResendVerification } from "./resend-verification";

/**
 * Baner niepotwierdzonego adresu z „Wyślij ponownie” — na `/account` (s04.3) i `/mentor` (s09.2, G7), każdy z własnym
 * zdaniem. „Zmień adres” dochodzi w etapie B. Luka DS02 — baner z tokenów, bez `Alert`.
 */
export function VerificationBanner({ message }: { message: string }) {
  return (
    <section
      aria-label="Potwierdzenie adresu e-mail"
      className="flex flex-col gap-in-group rounded-md border border-border bg-muted px-between-groups py-in-group"
    >
      <p className="text-body">{message}</p>
      <ResendVerification />
    </section>
  );
}
