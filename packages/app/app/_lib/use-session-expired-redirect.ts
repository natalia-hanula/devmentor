import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { loginPath } from "./login-path";

/** Kod `UnauthorizedError` z `@devmentor/core` (kopia — kod przeglądarki nie importuje głównego `core`). */
const UNAUTHORIZED_CODE = "UNAUTHORIZED";

/**
 * Decyzja 17 (L07): komponent panelu, który dostał 401 z API, odsyła na `/login` z „Sesja wygasła”
 * i powrotem na bieżącą stronę. Strona panelu przeszła bramkę z ważną sesją, więc 401 oznacza, że
 * sesja przestała obowiązywać (wygasła, podbita wersja, usunięte konto). Zwraca `true`, gdy przekierowało.
 * Celowo w `app`, a nie w `apiCall`: `ui` nie zna tras aplikacji.
 */
export function useSessionExpiredRedirect(): (result: ApiResult<unknown>) => boolean {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (result: ApiResult<unknown>) => {
      if (result.ok || result.error.code !== UNAUTHORIZED_CODE) {
        return false;
      }
      router.replace(loginPath({ next: pathname, notice: "session_expired" }));
      return true;
    },
    [router, pathname],
  );
}
