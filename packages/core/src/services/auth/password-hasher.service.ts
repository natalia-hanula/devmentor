import bcrypt from "bcryptjs";

/** Koszt bcrypt (`AGENTS.md`: ≥ 12). Zmiana kosztu wymaga nowej atrapy hasha o tym samym koszcie. */
export const BCRYPT_COST = 12;

/**
 * Atrapa hasha dla kont nieistniejących lub bez hasła: porównanie z nią kosztuje tyle samo co z prawdziwym hashem,
 * więc czas odpowiedzi logowania nie zdradza, czy konto istnieje. Stała w kodzie zamiast wyliczanej leniwie — leniwe
 * wyliczenie dodałoby pierwszemu takiemu żądaniu drugi koszt bcrypt (wyróżniający się czas), a przy starcie procesu
 * opóźniałoby każdy start. Hash losowego, wyrzuconego hasła; wynik `verify` dla `null` i tak zawsze jest `false`.
 */
export const DUMMY_PASSWORD_HASH = "$2b$12$h898ddf59n0x6YQl1mF6AeCVhFVmwrCdp/gb9kqE02Jss0/hPAuzO";

/**
 * Hashowanie i sprawdzanie haseł (bcrypt). Bez polityki haseł — długość w bajtach sprawdza walidator,
 * listę najczęstszych haseł dokłada etap B. Niczego nie loguje.
 */
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  /** `passwordHash === null` (konto nie istnieje albo nie ma hasła): porównanie z atrapą, wynik zawsze `false`. */
  async verify(password: string, passwordHash: string | null): Promise<boolean> {
    if (passwordHash === null) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return false;
    }
    return bcrypt.compare(password, passwordHash);
  }
}
