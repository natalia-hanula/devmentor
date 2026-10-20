/* Pasek przeglądu (.doc-toolbar): warstwa recenzenta, osobno od nawigacji produktu (zasada 5).
   Silnik przeglądu dokleja tu swoje przyciski (Clickable/Comment, Presentation, Threads …) przed #theme-toggle. */
import { useState } from "react";
import { SCREENS, screenDef, type ScreenId } from "../sim/catalog";
import { applyPreset, hasPreset } from "../sim/presets";
import { openRoute, resetSimulation, sessionAccount, useSim, type Params } from "../sim/store";

/** Wejście na ekran z nawigacji przeglądu: domyślny adres ekranu (z tokenem tam, gdzie link go wymaga). */
const ENTRY: Partial<Record<ScreenId, [string, Params?]>> = {
  s01: ["/register"],
  s02: ["/login"],
  s03: ["/github"],
  s04: ["/account"],
  s05: ["/verify-email", { token: "ver-K2" }],
  s06: ["/forgot-password"],
  s07: ["/reset-password", { token: "K1" }],
  s08: ["/invite", { token: "inv-adam" }],
  s09: ["/mentor"],
  s10: ["/admin"],
  s11: ["/admin/invitations"],
  s12: ["/admin/outbox"],
};

function readTheme(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function ReviewBar() {
  const sim = useSim();
  const [dark, setDark] = useState(readTheme);
  const screen = screenDef(sim.current);
  const view = sim.views[sim.current];
  const account = sessionAccount(sim);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setDark(next);
  }

  return (
    <header className="doc-toolbar" aria-label="Pasek przeglądu prototypu">
      <div className="review-row">
        <span className="review-mark">Prototyp · dane fikcyjne · nic nie jest wysyłane</span>
        <nav className="screen-nav" aria-label="Ekrany prototypu">
          {SCREENS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={item.id === sim.current ? "true" : undefined}
              onClick={() => {
                const entry = ENTRY[item.id];
                if (entry) openRoute(entry[0], entry[1]);
              }}
            >
              {item.id} {item.name}
            </a>
          ))}
        </nav>
      </div>
      <div className="review-row">
        <label className="review-field">
          Stan
          <select
            value={view.state}
            onChange={(event) => applyPreset(event.target.value)}
            aria-label={`Stan ekranu ${screen.id} ${screen.name}`}
          >
            {screen.states.map((state) => (
              <option key={state.id} value={state.id} disabled={!hasPreset(state.id) && state.id !== view.state}>
                {state.id} {state.label}
                {state.ready ? "" : " — etap 2"}
              </option>
            ))}
          </select>
        </label>
        <span className="review-field">
          Adres <code className="review-address">{view.params.address ?? screen.route}</code>
        </span>
        <span className="review-field">Konto: {account ? `${account.id} ${account.name}` : "gość"}</span>
        <button type="button" className="btn btn-outline btn-sm" onClick={resetSimulation}>
          Resetuj symulację
        </button>
      </div>
      <button id="theme-toggle" type="button" className="btn btn-outline btn-sm" aria-pressed={dark} onClick={toggleTheme}>
        Ciemny motyw
      </button>
    </header>
  );
}
