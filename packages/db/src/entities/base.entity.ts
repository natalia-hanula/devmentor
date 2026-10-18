import { randomUUID } from "node:crypto";
import { p } from "@mikro-orm/postgresql";

/**
 * Kolumny wspólne dla każdej encji. UUID zamiast sekwencji, żeby nie dało się
 * wyliczać cudzych rekordów (rezerwacji, płatności, wiadomości) po kolejnych ID.
 */
export const baseProperties = {
  id: p.uuid().primary().onCreate(() => randomUUID()),
  createdAt: p.datetime().onCreate(() => new Date()),
  updatedAt: p
    .datetime()
    .onCreate(() => new Date())
    .onUpdate(() => new Date()),
};
