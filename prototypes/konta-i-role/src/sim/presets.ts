/* Skróty recenzenta: wybór stanu sNN.M w pasku przeglądu ustawia sesję i widok tak,
   żeby stan był widoczny od razu (zatwierdzone w etapie 0, pytanie 3). Nie są funkcją produktu. */
import type { ScreenId } from "./catalog";
import {
  acceptInvitation,
  createInvitation,
  getState,
  login,
  logout,
  navigateEngine,
  openRoute,
  register,
  revokeInvitation,
  revokeMentorRole,
  setState,
  setView,
  type Params,
} from "./store";
import { DEMO_PASSWORD } from "./data";

function as(sessionId: string | null): void {
  setState((current) => ({ ...current, sessionId }));
}

/** Zamrożony widok: stan zostaje na ekranie (np. ładowanie), dopóki recenzent go nie zmieni. */
function freeze(screen: ScreenId, state: string, params: Params = {}): void {
  const view = getState().views[screen];
  setView(screen, { state, params: { ...view.params, ...params, frozen: "1" }, nonce: view.nonce + 1 });
  setState((current) => ({ ...current, current: screen }));
  navigateEngine(screen);
}

const PRESETS: Record<string, () => void> = {
  "s01.1": () => { as(null); openRoute("/register"); },
  "s01.4": () => { as(null); openRoute("/register"); freeze("s01", "s01.4"); },
  "s01.10": () => { as(null); void register("Ola Testowa", "ola.testowa@example.com", DEMO_PASSWORD); },
  "s01.11": () => {
    as(null);
    setState((current) => ({ ...current, storedInviteToken: "inv-adam" }));
    openRoute("/register?next=%2Finvite");
  },
  "s02.1": () => { as(null); openRoute("/login"); },
  "s02.3": () => { as(null); openRoute("/login"); freeze("s02", "s02.3"); },
  "s02.8": () => { as(null); void login("marta.kowal@example.com", DEMO_PASSWORD); },
  "s02.9": () => { as(null); openRoute("/login?next=%2Fmentor", { email: "ewa.zielinska@example.com" }); },
  "s02.11": () => {
    as(null);
    setState((current) => ({ ...current, storedInviteToken: "inv-adam" }));
    openRoute("/login?next=%2Finvite");
  },
  "s02.13": () => { as("K1"); logout(); },
  "s04.1": () => { as("K1"); openRoute("/account"); freeze("s04", "s04.1"); },
  "s04.2": () => { as("K1"); openRoute("/account"); },
  "s04.3": () => { as("K2"); openRoute("/account"); },
  "s04.4": () => { as("K2"); openRoute("/account"); freeze("s04", "s04.4", { resend: "sent" }); },
  "s04.9": () => { as("K1"); logout(); },
  "s04.10": () => { as("K6"); openRoute("/account"); },
  "s05.1": () => { as(null); openRoute("/verify-email", { token: "ver-K2" }); freeze("s05", "s05.1"); },
  "s05.2": () => { as(null); openRoute("/verify-email", { token: "ver-K2" }); freeze("s05", "s05.2"); },
  "s05.8": () => {
    as("K1");
    openRoute("/verify-email", { token: "ver-K2" });
    freeze("s05", "s05.8", { confirmedEmail: "piotr.lis@exmaple.com" });
  },
  "s05.3": () => { as(null); openRoute("/verify-email", { token: "ver-zmyslony" }); },
  "s05.4": () => { as("K1"); openRoute("/verify-email"); },
  "s05.5": () => { as(null); openRoute("/verify-email"); },
  "s08.5": () => { as("K4"); openRoute("/invite", { token: "inv-adam" }); void acceptInvitation(); },
  "s08.6": () => { as("K1"); openRoute("/invite", { token: "inv-lena" }); void acceptInvitation(); },
  "s08.8": () => {
    as("K1");
    setState((current) => ({ ...current, storedInviteToken: null }));
    openRoute("/invite");
  },
  "s08.1": () => { as(null); openRoute("/invite", { token: "inv-adam" }); },
  "s08.2": () => { as("K1"); openRoute("/invite", { token: "inv-adam" }); },
  "s08.3": () => { as("K1"); openRoute("/invite", { token: "inv-adam" }); freeze("s08", "s08.3"); },
  "s08.4": () => {
    as("K1");
    openRoute("/invite", { token: "inv-adam" });
    void acceptInvitation();
  },
  "s09.1": () => { as("K4"); openRoute("/mentor"); },
  "s09.2": () => { as("K5"); openRoute("/mentor"); },
  "s09.5": () => { as(null); openRoute("/mentor"); },
  "s09.7": () => { as("K4"); openRoute("/mentor"); freeze("s09", "s09.7"); },
  "s10.1": () => { as("K6"); openRoute("/admin"); },
  "s10.3": () => { as(null); openRoute("/admin"); },
  "s11.1": () => { as("K6"); openRoute("/admin/invitations"); freeze("s11", "s11.1"); },
  "s11.3": () => { as("K6"); openRoute("/admin/invitations"); },
  "s11.4": () => { as("K6"); openRoute("/admin/invitations"); freeze("s11", "s11.4"); },
  "s11.5": () => { as("K6"); openRoute("/admin/invitations"); void createInvitation("ola.testowa@example.com"); },
  "s11.9": () => { as("K6"); openRoute("/admin/invitations"); void revokeInvitation("inv-adam"); },
  "s11.10": () => { as("K6"); openRoute("/admin/invitations"); void revokeMentorRole("inv-ewa"); },
  "s12.1": () => { as("K6"); openRoute("/admin/outbox"); },
  "s12.3": () => { as("K6"); openRoute("/admin/outbox"); freeze("s12", "s12.3", { expanded: "m1" }); },
  "s12.4": () => { as("K6"); openRoute("/admin/outbox"); freeze("s12", "s12.4"); },
  "s13.1": () => { as("K1"); openRoute("/mentor"); },
  "s13.2": () => { as("K6"); openRoute("/invite", { token: "inv-adam" }); },
};

export function hasPreset(stateId: string): boolean {
  return stateId in PRESETS;
}

export function applyPreset(stateId: string): void {
  PRESETS[stateId]?.();
}
