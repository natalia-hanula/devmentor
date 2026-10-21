import { isMailOutboxEnabled, parseEnv } from "@devmentor/core";
import Link from "next/link";
import { connection } from "next/server";

/**
 * Pozycja „Skrzynka” — tylko gdy działa skrzynka deweloperska (`MAIL_ADAPTER=outbox`).
 * `connection()` przenosi odczyt env na czas żądania: build idzie bez `.env`, a layout
 * renderuje to pod `<Suspense>` jako jedyną dynamiczną część nawigacji (`cacheComponents`).
 */
export async function OutboxNavLink({ className }: { className: string }) {
  await connection();
  if (!isMailOutboxEnabled(parseEnv())) {
    return null;
  }
  return (
    <Link href="/admin/outbox" className={className}>
      Skrzynka
    </Link>
  );
}
