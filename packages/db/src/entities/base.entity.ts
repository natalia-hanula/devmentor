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

/**
 * Przypina `class.name` encji do nazwy z `defineEntity`. Turbopack minifikuje nazwy klas w buildzie
 * produkcyjnym, a każda warstwa Next (trasy API, strony) ma własną kopię modułu encji, więc ta sama
 * klasa dostaje w nich różne nazwy (`User` → `j`, `x`…). Kontener ORM jest jeden na proces, a MikroORM
 * szuka metadanych po `class.name` — bez przypięcia strona nie znajduje encji zarejestrowanych
 * przez kontener utworzony w warstwie tras (`MetadataError: Metadata for entity j not found`).
 * Wołaj przed `Schema.setClass(...)`.
 */
export function pinEntityName(entity: abstract new (...args: never[]) => object, name: string): void {
  Object.defineProperty(entity, "name", { value: name });
}
