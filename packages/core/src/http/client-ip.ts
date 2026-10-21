/** Klucz limitera, gdy adresu klienta nie da się ustalić (brak lub pusty `x-forwarded-for`). */
export const UNKNOWN_CLIENT_IP = "unknown";

/**
 * Adres klienta do kluczy limitera: **ostatni** wpis z `x-forwarded-for`. Pierwsze wpisy podaje
 * sam klient i może je dowolnie podrobić; ostatni dopisuje reverse proxy stojący bezpośrednio przed
 * aplikacją. Bez takiego proxy klient kontroluje cały nagłówek, więc klucze po IP to tylko pierwsza
 * linia obrony (spec platform primitives, Risks).
 */
export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const last = forwardedFor.slice(forwardedFor.lastIndexOf(",") + 1).trim();
  return last === "" ? UNKNOWN_CLIENT_IP : last;
}
