import { useEffect, type ComponentType } from "react";
import { ReviewBar } from "./review/review-bar";
import { SCREENS, type ScreenId } from "./sim/catalog";
import { setCurrentScreen, useSim } from "./sim/store";
import {
  ForgotPasswordScreen,
  GithubScreen,
  InviteScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
  VerifyEmailScreen,
} from "./screens/auth-screens";
import {
  AccountScreen,
  AdminOverviewScreen,
  ForbiddenScreen,
  InvitationsScreen,
  MentorScreen,
  OutboxScreen,
} from "./screens/panel-screens";

const SCREEN_COMPONENTS: Record<ScreenId, ComponentType> = {
  s01: RegisterScreen,
  s02: LoginScreen,
  s03: GithubScreen,
  s04: AccountScreen,
  s05: VerifyEmailScreen,
  s06: ForgotPasswordScreen,
  s07: ResetPasswordScreen,
  s08: InviteScreen,
  s09: MentorScreen,
  s10: AdminOverviewScreen,
  s11: InvitationsScreen,
  s12: OutboxScreen,
  s13: ForbiddenScreen,
};

export function App() {
  const sim = useSim();

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (typeof detail === "string" && detail in SCREEN_COMPONENTS) setCurrentScreen(detail as ScreenId);
    };
    document.addEventListener("prototype:screen-change", onChange);
    // Silnik przeglądu startuje po pierwszym renderze stałych sekcji ekranów (README silnika).
    window.__PROTOTYPE_START__?.();
    return () => document.removeEventListener("prototype:screen-change", onChange);
  }, []);

  return (
    <>
      <ReviewBar />
      <div className="doc">
        <div className="doc-head">
          <h1>Prototyp: konta i role (Epik 01)</h1>
          <p className="note">
            Ekrany s01–s13 z mapy ekranów (lekcja-07/mapa-ekranow.md). Wygląd z design systemu (packages/ui), dane fikcyjne,
            stały zegar demo: śr. 21.10.2026, 10:00 (Europe/Warsaw).
          </p>
        </div>
        {SCREENS.map((screen) => {
          const Screen = SCREEN_COMPONENTS[screen.id];
          return (
            <section key={screen.id} className="screen" id={screen.id} aria-label={`${screen.id} ${screen.name}`}>
              <div className="screen-meta">
                <h2>
                  {screen.id} · {screen.name}
                  {screen.stageB ? " [etap B]" : ""}
                </h2>
                <p>
                  {screen.route} · rola: {screen.roles} · stan: {sim.views[screen.id].state}
                </p>
              </div>
              <div className="frame">
                <Screen key={sim.resetCount} />
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
