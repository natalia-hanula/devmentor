/** Klucz limitera, gdy adresu klienta nie da się ustalić (brak zaufanego proxy, brak lub pusty `x-forwarded-for`). */
export const UNKNOWN_CLIENT_IP = "unknown";

export interface ClientIpOptions {
  /** `env.TRUST_PROXY` — wołający przekazuje wartość z cradle, żeby nie parsować env na poziomie modułu. */
  trustProxy: boolean;
}

/**
 * Adres klienta do kluczy limitera. Tylko przy `trustProxy` bierzemy **ostatni** wpis z
 * `x-forwarded-for` — dopisuje go reverse proxy stojący bezpośrednio przed aplikacją, a pierwsze wpisy
 * podaje sam klient i może je dowolnie podrobić. Bez zaufanego proxy klient kontroluje cały nagłówek,
 * więc zwracamy `UNKNOWN_CLIENT_IP` niezależnie od jego treści (spec platform primitives, Limiter).
 */
export function clientIp(request: Request, { trustProxy }: ClientIpOptions): string {
  if (!trustProxy) {
    return UNKNOWN_CLIENT_IP;
  }
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const last = forwardedFor.slice(forwardedFor.lastIndexOf(",") + 1).trim();
  return last === "" ? UNKNOWN_CLIENT_IP : last;
}
