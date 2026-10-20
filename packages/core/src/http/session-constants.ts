// Bez importów: `proxy.ts` bierze stąd stałe, nie ciągnąc ORM-a ani loggera.
export const SESSION_COOKIE_NAME = "devmentor_session";
/** Ważność sesji z `AGENTS.md` (~24 h, bez refresh tokenów). */
export const SESSION_TTL_SECONDS = 24 * 60 * 60;
