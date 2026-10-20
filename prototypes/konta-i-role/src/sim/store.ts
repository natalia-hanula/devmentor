/* Stan symulacji: jeden magazyn w pamięci karty (nic nie trafia do sieci, ciasteczek ani storage).
   Odpowiedzi „API” mają kształt koperty z @devmentor/ui (`ApiResult`). */
import { useSyncExternalStore } from "react";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { SCREENS, type ScreenId } from "./catalog";
import {
  ACCOUNTS,
  DEMO_NOW,
  DEMO_ORIGIN,
  DEMO_PASSWORD,
  INVITATIONS,
  INVITATION_TTL_DAYS,
  OUTBOX,
  VERIFY_TOKENS,
  VERIFY_TTL_HOURS,
  type Account,
  type Invitation,
  type Mail,
  type Role,
  type VerifyToken,
} from "./data";

export type Params = Record<string, string>;

export interface View {
  state: string;
  params: Params;
  /** Zmienia się przy każdym wejściu na ekran — formularze dostają świeży stan. */
  nonce: number;
}

export interface CreatedInvitation {
  invitationId: string;
  email: string;
  link: string;
  revokedPrevious: boolean;
  mailFailed: boolean;
}

export interface SimState {
  sessionId: string | null;
  accounts: Account[];
  invitations: Invitation[];
  outbox: Mail[];
  verifyTokens: VerifyToken[];
  /** Symulowany `sessionStorage` z tokenem zaproszenia (spec E01: token nigdy w `next`). */
  storedInviteToken: string | null;
  /** Jednorazowy panel z linkiem po utworzeniu zaproszenia (s11.5). */
  createdInvitation: CreatedInvitation | null;
  views: Record<ScreenId, View>;
  current: ScreenId;
  /** Zwiększany przy „Resetuj symulację” — ekrany montują się od nowa. */
  resetCount: number;
  seq: number;
}

/** Opóźnienie symulowanego żądania: na tyle długie, żeby było widać stan ładowania i wysyłania. */
export const config = { latencyMs: 450 };

export const START_SCREEN: ScreenId = "s02";

function initialViews(): Record<ScreenId, View> {
  const views = {} as Record<ScreenId, View>;
  for (const screen of SCREENS) {
    views[screen.id] = { state: `${screen.id}.1`, params: { address: screen.route }, nonce: 0 };
  }
  return views;
}

export function initialState(resetCount = 0): SimState {
  const base: SimState = {
    sessionId: null,
    accounts: ACCOUNTS.map((account) => ({ ...account, roles: [...account.roles] })),
    invitations: INVITATIONS.map((invitation) => ({ ...invitation })),
    outbox: OUTBOX.map((mail) => ({ ...mail })),
    verifyTokens: VERIFY_TOKENS.map((token) => ({ ...token })),
    storedInviteToken: null,
    createdInvitation: null,
    views: initialViews(),
    current: START_SCREEN,
    resetCount,
    seq: 1,
  };
  // Domyślne widoki ekranów wybierane z nawigacji przeglądu: sensowny punkt wejścia każdego ekranu.
  base.views.s08 = viewFor(resolveRoute("/invite", base, { token: "inv-adam" }), 0);
  base.views.s05 = viewFor(resolveRoute("/verify-email", base, { token: "ver-K2" }), 0);
  return base;
}

let state: SimState;
const listeners = new Set<() => void>();

export function getState(): SimState {
  return state;
}

export function setState(update: (current: SimState) => SimState): void {
  state = update(state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSim(): SimState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function resetSimulation(): void {
  setState((current) => initialState(current.resetCount + 1));
  navigateEngine(START_SCREEN);
}

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, config.latencyMs));
}

/* ---------- Zegar i formaty ---------- */

export function now(): number {
  return Date.parse(DEMO_NOW);
}

const DATE_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

function addHours(iso: number, hours: number): string {
  return new Date(iso + hours * 3_600_000).toISOString();
}

/* ---------- Konta i role ---------- */

export function sessionAccount(current: SimState = state): Account | null {
  return current.accounts.find((account) => account.id === current.sessionId) ?? null;
}

export function hasRole(account: Account | null, role: Role): boolean {
  return Boolean(account?.roles.includes(role));
}

/** Strony startowe ról (L03). */
export function homeRoute(account: Account): string {
  if (hasRole(account, "operator")) return "/admin/invitations";
  if (hasRole(account, "mentor")) return "/mentor";
  return "/account";
}

/** Bezpieczny `next` (PP `safeNextPath`): tylko ścieżka względna, inaczej „/”. */
export function safeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** Status wyliczany wg reguły spec: accepted > revoked > expired > pending. */
export function invitationStatus(invitation: Invitation): InvitationStatus {
  if (invitation.acceptedBy) return "accepted";
  if (invitation.revoked) return "revoked";
  if (Date.parse(invitation.expiresAt) <= now()) return "expired";
  return "pending";
}

/* ---------- Trasy ---------- */

export interface Resolved {
  screen: ScreenId;
  state: string;
  params: Params;
}

/** Stany ładowania z mapy (s10 nie ma osobnego — karta stanu bazy ładuje się sama). */
const LOADING_STATES: Partial<Record<ScreenId, string>> = { s04: "s04.1", s09: "s09.7", s11: "s11.1", s12: "s12.4" };

const ROUTE_SCREENS: Record<string, ScreenId> = {
  "/register": "s01",
  "/login": "s02",
  "/github": "s03",
  "/account": "s04",
  "/verify-email": "s05",
  "/forgot-password": "s06",
  "/reset-password": "s07",
  "/invite": "s08",
  "/mentor": "s09",
  "/admin": "s10",
  "/admin/invitations": "s11",
  "/admin/outbox": "s12",
};

/** Bramki stron (PP) i strony startowe (L03, L05): dokąd trafia dana ścieżka przy danej sesji. */
export function resolveRoute(path: string, current: SimState, extra: Params = {}): Resolved {
  const url = new URL(path, DEMO_ORIGIN);
  const pathname = url.pathname;
  const next = url.searchParams.get("next") ?? undefined;
  const account = sessionAccount(current);
  const address = pathname + url.search + (extra.token ? `#token=${extra.token}` : "");
  const params: Params = { ...extra, address };
  if (next) params.next = next;
  const toLogin = () => resolveRoute(`/login?next=${encodeURIComponent(pathname)}`, current, { redirectedFrom: pathname });
  const forbidden = (requiredRole: Role, state = "s13.1"): Resolved => ({
    screen: "s13",
    state,
    params: { ...params, requiredRole, pathname },
  });

  switch (pathname) {
    case "/login":
    case "/register": {
      if (account) return resolveRoute(safeNext(next) ?? homeRoute(account), current);
      const screen = ROUTE_SCREENS[pathname];
      if (pathname === "/login" && extra.notice === "logged-out") return { screen, state: "s02.13", params };
      if (next === "/invite") return { screen, state: `${screen}.11`, params };
      return { screen, state: `${screen}.1`, params };
    }
    case "/account":
      if (!account) return toLogin();
      return { screen: "s04", state: "s04.1", params: { ...params, autoload: "1" } };
    case "/verify-email":
      return { screen: "s05", state: "s05.1", params: { ...params, autoload: "1" } };
    case "/invite": {
      if (hasRole(account, "operator")) return forbidden("mentor", "s13.2");
      const token = extra.token ?? current.storedInviteToken ?? undefined;
      if (!token) return { screen: "s08", state: "s08.8", params };
      return { screen: "s08", state: account ? "s08.2" : "s08.1", params: { ...params, token } };
    }
    case "/mentor":
      if (!account) return toLogin();
      if (hasRole(account, "operator")) return forbidden("mentor", "s13.2");
      if (!hasRole(account, "mentor")) return forbidden("mentor");
      return { screen: "s09", state: "s09.7", params: { ...params, autoload: "1" } };
    case "/admin":
    case "/admin/invitations":
    case "/admin/outbox": {
      if (!account) return toLogin();
      if (!hasRole(account, "operator")) return forbidden("operator");
      const screen = ROUTE_SCREENS[pathname];
      return { screen, state: LOADING_STATES[screen] ?? `${screen}.1`, params: { ...params, autoload: "1" } };
    }
    case "/github":
    case "/forgot-password":
    case "/reset-password": {
      const screen = ROUTE_SCREENS[pathname];
      return { screen, state: `${screen}.1`, params };
    }
    default:
      // „/” i nieznane ścieżki: strona startowa roli albo logowanie (strony publiczne są poza E01).
      return account ? resolveRoute(homeRoute(account), current) : resolveRoute("/login", current);
  }
}

function viewFor(resolved: Resolved, nonce: number): View {
  return { state: resolved.state, params: resolved.params, nonce };
}

/** Stan po załadowaniu danych ekranu (po `autoload`). */
function loadedState(screen: ScreenId, current: SimState): string {
  const account = sessionAccount(current);
  switch (screen) {
    case "s04":
      if (hasRole(account, "operator")) return "s04.10";
      return account?.emailVerified ? "s04.2" : "s04.3";
    case "s09":
      return account?.emailVerified ? "s09.1" : "s09.2";
    case "s11":
      return current.invitations.length ? "s11.3" : "s11.2";
    case "s12":
      return current.outbox.length ? "s12.1" : "s12.2";
    case "s10":
      return "s10.1";
    default:
      return current.views[screen].state;
  }
}

/** Przejście silnika przeglądu do ekranu — po zatwierdzeniu renderu Reacta. */
export function navigateEngine(screen: ScreenId): void {
  setTimeout(() => document.dispatchEvent(new CustomEvent("prototype:navigate", { detail: screen })), 0);
}

export function setView(screen: ScreenId, update: Partial<View> & { state: string }): void {
  setState((current) => ({
    ...current,
    views: {
      ...current.views,
      [screen]: { params: current.views[screen].params, nonce: current.views[screen].nonce, ...update },
    },
  }));
}

function patchView(screen: ScreenId, stateId: string, params?: Params): void {
  const view = state.views[screen];
  setView(screen, { state: stateId, params: { ...view.params, ...params }, nonce: view.nonce });
}

/** Otwiera „adres” produktu: bramki, przekierowania i ładowanie danych. */
export function openRoute(path: string, extra: Params = {}): ScreenId {
  if (path.startsWith("/invite") && extra.token) {
    setState((current) => ({ ...current, storedInviteToken: extra.token }));
  }
  const resolved = resolveRoute(path, state, extra);
  const nonce = state.views[resolved.screen].nonce + 1;
  setState((current) => ({
    ...current,
    current: resolved.screen,
    views: { ...current.views, [resolved.screen]: viewFor(resolved, nonce) },
  }));
  navigateEngine(resolved.screen);
  if (resolved.params.autoload && !resolved.params.frozen) void autoload(resolved.screen, nonce);
  return resolved.screen;
}

async function autoload(screen: ScreenId, nonce: number): Promise<void> {
  await wait();
  if (state.views[screen].nonce !== nonce) return;
  if (screen === "s05") {
    finishEmailVerification();
    return;
  }
  patchView(screen, loadedState(screen, state));
}

export function setCurrentScreen(screen: ScreenId): void {
  if (state.current !== screen) setState((current) => ({ ...current, current: screen }));
}

/* ---------- Akcje produktu (symulowane trasy API) ---------- */

const GENERIC_LOGIN_ERROR = "Nieprawidłowy e-mail lub hasło";

function fail<T>(code: string, message: string, fieldErrors?: Record<string, string[]>): ApiResult<T> {
  return { ok: false, error: { code, message, fieldErrors } };
}

function nextId(prefix: string): string {
  const id = `${prefix}${state.seq}`;
  setState((current) => ({ ...current, seq: current.seq + 1 }));
  return id;
}

function destinationAfterLogin(account: Account, next: string | undefined): string {
  return safeNext(next) ?? homeRoute(account);
}

export async function login(email: string, password: string, next?: string): Promise<ApiResult<null>> {
  await wait();
  const account = state.accounts.find((candidate) => !candidate.guestOnly && candidate.email === normalizeEmail(email));
  // Ten sam komunikat dla nieznanego e-maila, złego hasła i konta bez hasła (17.3).
  if (!account || account.login === "github" || password !== DEMO_PASSWORD) {
    return fail("UNAUTHORIZED", GENERIC_LOGIN_ERROR);
  }
  setState((current) => ({ ...current, sessionId: account.id }));
  openRoute(destinationAfterLogin(account, next));
  return { ok: true, data: null };
}

function addVerifyMail(current: SimState, account: Account): SimState {
  const token = `ver-${account.id}-${current.seq}`;
  const mail: Mail = {
    id: `m${current.seq}`,
    sentAt: DEMO_NOW,
    to: account.email,
    subject: "Potwierdź adres e-mail",
    kind: "verify",
    token,
  };
  return {
    ...current,
    seq: current.seq + 1,
    outbox: [mail, ...current.outbox],
    verifyTokens: [...current.verifyTokens, { token, accountId: account.id, expiresAt: addHours(now(), VERIFY_TTL_HOURS) }],
  };
}

export async function register(name: string, email: string, password: string, next?: string): Promise<ApiResult<null>> {
  await wait();
  const normalized = normalizeEmail(email);
  const existing = state.accounts.find((account) => account.email === normalized);
  if (existing && !existing.guestOnly) {
    return fail("CONFLICT", "Ten e-mail ma już konto", { email: ["Ten e-mail ma już konto"] });
  }
  // Hasło nie jest nigdzie zapisywane — symulacja sprawdza tylko długość (min. 12 znaków).
  void password;
  const id = existing?.id ?? nextId("N");
  const account: Account = { id, name: name.trim(), email: normalized, roles: ["mentee"], emailVerified: false, login: "password" };
  setState((current) => {
    const accounts = existing
      ? current.accounts.map((candidate) => (candidate.id === id ? account : candidate))
      : [...current.accounts, account];
    return addVerifyMail({ ...current, accounts, sessionId: id }, account);
  });
  openRoute(destinationAfterLogin(account, next));
  return { ok: true, data: null };
}

export function logout(): void {
  setState((current) => ({ ...current, sessionId: null }));
  openRoute("/login", { notice: "logged-out" });
}

export async function resendVerification(screen: ScreenId): Promise<void> {
  const account = sessionAccount();
  if (!account) return;
  patchView(screen, state.views[screen].state, { resend: "sending" });
  await wait();
  setState((current) => addVerifyMail(current, account));
  patchView(screen, screen === "s04" ? "s04.4" : state.views[screen].state, { resend: "sent" });
}

function finishEmailVerification(): void {
  const view = state.views.s05;
  const account = sessionAccount();
  const token = view.params.token;
  if (!token) {
    patchView("s05", account?.emailVerified ? "s05.4" : "s05.5");
    return;
  }
  const record = state.verifyTokens.find((candidate) => candidate.token === token);
  if (!record || record.used || Date.parse(record.expiresAt) <= now()) {
    patchView("s05", "s05.3");
    return;
  }
  const owner = state.accounts.find((candidate) => candidate.id === record.accountId);
  setState((current) => ({
    ...current,
    verifyTokens: current.verifyTokens.map((candidate) => (candidate.token === token ? { ...candidate, used: true } : candidate)),
    accounts: current.accounts.map((candidate) => (candidate.id === record.accountId ? { ...candidate, emailVerified: true } : candidate)),
  }));
  // L23: token zawsze idzie do potwierdzenia; sesja innego konta zostaje bez zmian.
  if (account && account.id !== record.accountId) {
    patchView("s05", "s05.8", { confirmedEmail: owner?.email ?? "" });
    return;
  }
  patchView("s05", "s05.2");
}

export async function acceptInvitation(): Promise<void> {
  patchView("s08", "s08.3");
  await wait();
  const account = sessionAccount();
  const token = state.storedInviteToken;
  const invitation = state.invitations.find((candidate) => candidate.token === token);
  if (!account || !invitation || invitationStatus(invitation) !== "pending") {
    setState((current) => ({ ...current, storedInviteToken: null }));
    patchView("s08", "s08.6");
    return;
  }
  const alreadyMentor = hasRole(account, "mentor");
  setState((current) => ({
    ...current,
    storedInviteToken: null,
    invitations: current.invitations.map((candidate) =>
      candidate.id === invitation.id ? { ...candidate, acceptedBy: account.id } : candidate,
    ),
    accounts: current.accounts.map((candidate) =>
      candidate.id === account.id && !alreadyMentor
        ? { ...candidate, roles: [...candidate.roles, "mentor"], mentorRevoked: false }
        : candidate,
    ),
  }));
  // Spec E01: po sukcesie (także „Masz już rolę mentora”) token usunięty i przejście do /mentor.
  patchView("s08", alreadyMentor ? "s08.5" : "s08.4");
  openRoute("/mentor", alreadyMentor ? { notice: "already-mentor" } : {});
}

export function invitationLink(token: string): string {
  return `${DEMO_ORIGIN}/invite#token=${token}`;
}

export async function createInvitation(email: string): Promise<ApiResult<CreatedInvitation>> {
  await wait();
  const normalized = normalizeEmail(email);
  const id = nextId("inv-");
  const previous = state.invitations.find(
    (candidate) => candidate.email === normalized && invitationStatus(candidate) === "pending",
  );
  const invitation: Invitation = {
    id,
    token: id,
    email: normalized,
    createdAt: new Date(now()).toISOString(),
    expiresAt: addHours(now(), INVITATION_TTL_DAYS * 24),
  };
  const created: CreatedInvitation = {
    invitationId: id,
    email: normalized,
    link: invitationLink(id),
    revokedPrevious: Boolean(previous),
    mailFailed: false,
  };
  const mail: Mail = { id: `m-${id}`, sentAt: DEMO_NOW, to: normalized, subject: "Zaproszenie do DevMentor", kind: "invite", token: id };
  setState((current) => ({
    ...current,
    invitations: [
      invitation,
      ...current.invitations.map((candidate) => (candidate.id === previous?.id ? { ...candidate, revoked: true } : candidate)),
    ],
    outbox: [mail, ...current.outbox],
    createdInvitation: created,
  }));
  patchView("s11", "s11.5");
  return { ok: true, data: created };
}

export function dismissCreatedInvitation(): void {
  setState((current) => ({ ...current, createdInvitation: null }));
  patchView("s11", "s11.3");
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  await wait();
  setState((current) => ({
    ...current,
    invitations: current.invitations.map((candidate) =>
      candidate.id === invitationId ? { ...candidate, revoked: true } : candidate,
    ),
  }));
  patchView("s11", "s11.9", { notice: "revoked" });
}

export async function revokeMentorRole(invitationId: string): Promise<void> {
  await wait();
  const invitation = state.invitations.find((candidate) => candidate.id === invitationId);
  setState((current) => ({
    ...current,
    accounts: current.accounts.map((candidate) =>
      candidate.id === invitation?.acceptedBy
        ? { ...candidate, roles: candidate.roles.filter((role) => role !== "mentor"), mentorRevoked: true }
        : candidate,
    ),
  }));
  patchView("s11", "s11.10", { notice: "role-revoked" });
}

/** Link z wiadomości w skrzynce → ekran produktu (G10). */
export function openMailLink(mail: Mail): void {
  if (mail.kind === "invite") openRoute("/invite", { token: mail.token });
  else if (mail.kind === "verify") openRoute("/verify-email", { token: mail.token });
  else openRoute("/reset-password", { token: mail.token });
}

export function mailLink(mail: Mail): string {
  const path = mail.kind === "invite" ? "/invite" : mail.kind === "verify" ? "/verify-email" : "/reset-password";
  return `${DEMO_ORIGIN}${path}#token=${mail.token}`;
}

export function accountName(id: string | undefined): string {
  return state.accounts.find((account) => account.id === id)?.name ?? "—";
}

state = initialState();
