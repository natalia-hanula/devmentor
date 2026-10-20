/* Dane demo z mapy ekranów (lekcja-07/mapa-ekranow.md, sekcja 3). Wszystko fikcyjne:
   adresy w domenie example.com, bez cen, terminów, ocen i liczb użytkowników. */

export type Role = "mentee" | "mentor" | "operator";
export type LoginMethod = "password" | "github" | "password+github";

export interface Account {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  emailVerified: boolean;
  login: LoginMethod;
  /** Operator odebrał rolę mentora (L10) — wtórna informacja w liście zaproszeń. */
  mentorRevoked?: boolean;
  /** Konto tylko w danych demo, bez profilu w produkcie (K7: gość z zaproszeniem). */
  guestOnly?: boolean;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  acceptedBy?: string;
  revoked?: boolean;
}

export type MailKind = "verify" | "reset" | "invite";

export interface Mail {
  id: string;
  sentAt: string;
  to: string;
  subject: string;
  kind: MailKind;
  /** Token z linku: konto (verify, reset) albo zaproszenie (invite). */
  token: string;
  stageB?: boolean;
}

export interface VerifyToken {
  token: string;
  accountId: string;
  expiresAt: string;
  used?: boolean;
}

/** Stały „teraz” zegara demo: środa 2026-10-21, 10:00 Europe/Warsaw (mapa, sekcja 3). */
export const DEMO_NOW = "2026-10-21T10:00:00+02:00";
/** Hasło traktowane w symulacji jako poprawne; każde inne daje ogólny błąd logowania. */
export const DEMO_PASSWORD = "demo-haslo-12";
/** Ważność zaproszenia: 14 dni (Q11). */
export const INVITATION_TTL_DAYS = 14;
/** Ważność linku weryfikacyjnego: 24 h (spec E01). */
export const VERIFY_TTL_HOURS = 24;
/** Adres przykładowej instancji w linkach z wiadomości i z panelu zaproszenia. */
export const DEMO_ORIGIN = "https://devmentor.example";

export const ACCOUNTS: Account[] = [
  { id: "K1", name: "Marta Kowal", email: "marta.kowal@example.com", roles: ["mentee"], emailVerified: true, login: "password" },
  { id: "K2", name: "Piotr Lis", email: "piotr.lis@exmaple.com", roles: ["mentee"], emailVerified: false, login: "password" },
  { id: "K3", name: "jkrol-dev", email: "jakub.krol@example.com", roles: ["mentee"], emailVerified: true, login: "github" },
  { id: "K4", name: "Ewa Zielińska", email: "ewa.zielinska@example.com", roles: ["mentee", "mentor"], emailVerified: true, login: "password" },
  { id: "K5", name: "Tomasz Wrona", email: "tomasz.wrona@example.com", roles: ["mentee", "mentor"], emailVerified: false, login: "password" },
  { id: "K6", name: "Operator Demo", email: "operator@example.com", roles: ["operator"], emailVerified: true, login: "password" },
  { id: "K7", name: "Adam Nowy", email: "adam.nowy@example.com", roles: [], emailVerified: false, login: "password", guestOnly: true },
  { id: "K8", name: "Karol Sowa", email: "karol.sowa@example.com", roles: ["mentee"], emailVerified: true, login: "password", mentorRevoked: true },
];

export const INVITATIONS: Invitation[] = [
  { id: "inv-adam", token: "inv-adam", email: "adam.nowy@example.com", createdAt: "2026-10-20T09:00:00+02:00", expiresAt: "2026-11-03T09:00:00+01:00" },
  { id: "inv-ewa", token: "inv-ewa", email: "ewa.zielinska@example.com", createdAt: "2026-10-13T12:00:00+02:00", expiresAt: "2026-10-27T12:00:00+01:00", acceptedBy: "K4" },
  { id: "inv-tomasz", token: "inv-tomasz", email: "tomasz.wrona@example.com", createdAt: "2026-10-15T08:30:00+02:00", expiresAt: "2026-10-29T08:30:00+01:00", acceptedBy: "K5" },
  { id: "inv-karol", token: "inv-karol", email: "karol.sowa@example.com", createdAt: "2026-10-10T10:00:00+02:00", expiresAt: "2026-10-24T10:00:00+02:00", acceptedBy: "K8" },
  { id: "inv-lena", token: "inv-lena", email: "lena.mazur@example.com", createdAt: "2026-10-01T10:00:00+02:00", expiresAt: "2026-10-15T10:00:00+02:00" },
  { id: "inv-olga", token: "inv-olga", email: "olga.bury@example.com", createdAt: "2026-10-12T14:00:00+02:00", expiresAt: "2026-10-26T14:00:00+01:00", revoked: true },
];

export const OUTBOX: Mail[] = [
  { id: "m3", sentAt: "2026-10-21T09:30:00+02:00", to: "marta.kowal@example.com", subject: "Ustaw nowe hasło", kind: "reset", token: "K1", stageB: true },
  { id: "m2", sentAt: "2026-10-20T18:00:00+02:00", to: "piotr.lis@exmaple.com", subject: "Potwierdź adres e-mail", kind: "verify", token: "ver-K2" },
  { id: "m1", sentAt: "2026-10-20T09:00:00+02:00", to: "adam.nowy@example.com", subject: "Zaproszenie do DevMentor", kind: "invite", token: "inv-adam" },
];

export const VERIFY_TOKENS: VerifyToken[] = [
  { token: "ver-K2", accountId: "K2", expiresAt: "2026-10-21T18:00:00+02:00" },
];
