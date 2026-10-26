const OCTET_VALUES = 256;
let counter = 0;

/**
 * Nagłówek `x-forwarded-for` z adresem niepowtarzalnym w przebiegu. Aplikacja testowa działa z
 * `TRUST_PROXY=true`, a liczniki limitera żyją w pamięci procesu przez cały przebieg, więc każdy test
 * (lub scenariusz) bierze własny adres i nie wyczerpuje limitów innym.
 */
export function uniqueClientIp(): { "x-forwarded-for": string } {
  counter += 1;
  return { "x-forwarded-for": `10.99.${Math.floor(counter / OCTET_VALUES)}.${counter % OCTET_VALUES}` };
}
