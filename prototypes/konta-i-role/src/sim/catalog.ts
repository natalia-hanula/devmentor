/* Katalog ekranów i stanów z mapy (lekcja-07/mapa-ekranow.md). Identyfikatory są stałe —
   przypinamy do nich komentarze. `ready` = stan zbudowany w prototypie (reszta: kolejne etapy). */

export type ScreenId =
  | "s01" | "s02" | "s03" | "s04" | "s05" | "s06" | "s07"
  | "s08" | "s09" | "s10" | "s11" | "s12" | "s13";

export interface StateDef {
  id: string;
  label: string;
  ready?: boolean;
}

export interface ScreenDef {
  id: ScreenId;
  name: string;
  route: string;
  roles: string;
  stageB?: boolean;
  states: StateDef[];
}

export const SCREENS: ScreenDef[] = [
  {
    id: "s01", name: "Rejestracja", route: "/register", roles: "gość",
    states: [
      { id: "s01.1", label: "domyślny", ready: true },
      { id: "s01.2", label: "bez GitHuba" },
      { id: "s01.3", label: "ostrzeżenie noop [B]" },
      { id: "s01.4", label: "wysyłanie", ready: true },
      { id: "s01.5", label: "błędy pól" },
      { id: "s01.6", label: "hasło odrzucone [B]" },
      { id: "s01.7", label: "konflikt e-maila" },
      { id: "s01.8", label: "429" },
      { id: "s01.9", label: "503" },
      { id: "s01.10", label: "sukces → strona startowa", ready: true },
      { id: "s01.11", label: "kontekst zaproszenia", ready: true },
      { id: "s01.12", label: "zalogowana osoba" },
    ],
  },
  {
    id: "s02", name: "Logowanie", route: "/login", roles: "gość",
    states: [
      { id: "s02.1", label: "domyślny", ready: true },
      { id: "s02.2", label: "bez GitHuba" },
      { id: "s02.3", label: "wysyłanie", ready: true },
      { id: "s02.4", label: "ogólny 401" },
      { id: "s02.5", label: "429" },
      { id: "s02.6", label: "503" },
      { id: "s02.7", label: "błąd GitHuba ?error= [B]" },
      { id: "s02.8", label: "sukces → strona startowa", ready: true },
      { id: "s02.9", label: "powrót do next", ready: true },
      { id: "s02.10", label: "sesja wygasła" },
      { id: "s02.11", label: "kontekst zaproszenia", ready: true },
      { id: "s02.12", label: "zalogowana osoba" },
      { id: "s02.13", label: "„Wylogowano”", ready: true },
    ],
  },
  {
    id: "s03", name: "GitHub — symulacja usługi zewnętrznej", route: "github.com/login/oauth (symulacja)", roles: "gość, zalogowany", stageB: true,
    states: [
      { id: "s03.1", label: "autoryzuj" },
      { id: "s03.2", label: "anuluj" },
      { id: "s03.3", label: "GitHub niedostępny" },
    ],
  },
  {
    id: "s04", name: "Konto", route: "/account", roles: "mentee, mentor, operator",
    states: [
      { id: "s04.1", label: "ładowanie", ready: true },
      { id: "s04.2", label: "adres potwierdzony", ready: true },
      { id: "s04.3", label: "adres niepotwierdzony", ready: true },
      { id: "s04.4", label: "ponowna wysyłka", ready: true },
      { id: "s04.5", label: "zmiana adresu [B]" },
      { id: "s04.6", label: "edycja nazwy [B]" },
      { id: "s04.7", label: "połączono z GitHubem [B]" },
      { id: "s04.8", label: "błąd ładowania" },
      { id: "s04.9", label: "wylogowanie", ready: true },
      { id: "s04.10", label: "widok operatora", ready: true },
    ],
  },
  {
    id: "s05", name: "Potwierdzenie e-maila", route: "/verify-email#token=…", roles: "gość, każdy zalogowany",
    states: [
      { id: "s05.1", label: "ładowanie", ready: true },
      { id: "s05.2", label: "sukces", ready: true },
      { id: "s05.3", label: "link nieważny", ready: true },
      { id: "s05.4", label: "już potwierdzony", ready: true },
      { id: "s05.5", label: "brak tokenu", ready: true },
      { id: "s05.6", label: "429" },
      { id: "s05.7", label: "503" },
      { id: "s05.8", label: "token innego konta", ready: true },
    ],
  },
  {
    id: "s06", name: "Nie pamiętam hasła", route: "/forgot-password", roles: "gość", stageB: true,
    states: [
      { id: "s06.1", label: "domyślny" },
      { id: "s06.2", label: "wysyłanie" },
      { id: "s06.3", label: "wynik zawsze ten sam" },
      { id: "s06.4", label: "zły format" },
      { id: "s06.5", label: "429" },
      { id: "s06.6", label: "503" },
      { id: "s06.7", label: "adres konta operatora" },
    ],
  },
  {
    id: "s07", name: "Nowe hasło", route: "/reset-password#token=…", roles: "gość (także zalogowany)", stageB: true,
    states: [
      { id: "s07.1", label: "formularz" },
      { id: "s07.2", label: "wysyłanie" },
      { id: "s07.3", label: "sukces" },
      { id: "s07.4", label: "link nieważny" },
      { id: "s07.5", label: "hasło odrzucone" },
      { id: "s07.6", label: "429/503" },
      { id: "s07.7", label: "brak tokenu" },
    ],
  },
  {
    id: "s08", name: "Zaproszenie mentora", route: "/invite#token=…", roles: "gość, mentee, mentor, operator",
    states: [
      { id: "s08.1", label: "gość z tokenem", ready: true },
      { id: "s08.2", label: "zalogowany „Przyjmij”", ready: true },
      { id: "s08.3", label: "przyjmowanie", ready: true },
      { id: "s08.4", label: "sukces → s09", ready: true },
      { id: "s08.5", label: "już mentor", ready: true },
      { id: "s08.6", label: "nieważne", ready: true },
      { id: "s08.7", label: "konto operatora" },
      { id: "s08.8", label: "brak tokenu", ready: true },
      { id: "s08.9", label: "429/503" },
    ],
  },
  {
    id: "s09", name: "Panel mentora — start", route: "/mentor", roles: "mentor",
    states: [
      { id: "s09.1", label: "domyślny", ready: true },
      { id: "s09.2", label: "baner niepotwierdzonego adresu", ready: true },
      { id: "s09.3", label: "brak dostępu (mentee)" },
      { id: "s09.4", label: "brak dostępu (operator)" },
      { id: "s09.5", label: "przekierowanie gościa", ready: true },
      { id: "s09.6", label: "rola odebrana w trakcie" },
      { id: "s09.7", label: "ładowanie/503", ready: true },
    ],
  },
  {
    id: "s10", name: "Panel operatora — Przegląd", route: "/admin", roles: "operator",
    states: [
      { id: "s10.1", label: "domyślny", ready: true },
      { id: "s10.2", label: "brak dostępu" },
      { id: "s10.3", label: "przekierowanie gościa", ready: true },
      { id: "s10.4", label: "503" },
    ],
  },
  {
    id: "s11", name: "Zaproszenia", route: "/admin/invitations", roles: "operator",
    states: [
      { id: "s11.1", label: "ładowanie", ready: true },
      { id: "s11.2", label: "pusta lista" },
      { id: "s11.3", label: "lista ze statusami", ready: true },
      { id: "s11.4", label: "formularz zaproszenia", ready: true },
      { id: "s11.5", label: "jednorazowy link", ready: true },
      { id: "s11.6", label: "poprzednie cofnięte" },
      { id: "s11.7", label: "mailFailed" },
      { id: "s11.8", label: "konflikt 409" },
      { id: "s11.9", label: "„Cofnij”", ready: true },
      { id: "s11.10", label: "„Odbierz rolę”", ready: true },
      { id: "s11.11", label: "brak dostępu" },
      { id: "s11.12", label: "błąd listy" },
    ],
  },
  {
    id: "s12", name: "Skrzynka deweloperska", route: "/admin/outbox", roles: "operator",
    states: [
      { id: "s12.1", label: "lista", ready: true },
      { id: "s12.2", label: "pusta" },
      { id: "s12.3", label: "rozwinięta wiadomość", ready: true },
      { id: "s12.4", label: "ładowanie/błąd", ready: true },
      { id: "s12.5", label: "wyłączona (noop)" },
      { id: "s12.6", label: "brak dostępu" },
    ],
  },
  {
    id: "s13", name: "Brak dostępu", route: "(wspólny widok w s08–s12)", roles: "zalogowany bez wymaganej roli",
    states: [
      { id: "s13.1", label: "bez roli", ready: true },
      { id: "s13.2", label: "operator na stronie mentora/zaproszenia", ready: true },
    ],
  },
];

export function screenDef(id: ScreenId): ScreenDef {
  const def = SCREENS.find((screen) => screen.id === id);
  if (!def) throw new Error(`Nieznany ekran: ${id}`);
  return def;
}
