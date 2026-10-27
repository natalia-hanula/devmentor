import { apiCall } from "@devmentor/ui/backend/api/api-call";
import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { useRouter } from "next/navigation";
import { roleStartPath } from "../_lib/role-start-path";

/** Fragment `AccountDto` z odpowiedzi logowania i rejestracji, potrzebny do wyboru strony startowej. */
interface SignedInAccount {
  roles: string[];
}

/**
 * Wysyłka formularza logowania lub rejestracji: po sukcesie (serwer ustawił ciasteczko) przejście na
 * bezpieczny `next`, a bez niego na stronę startową roli (L03, L05). Wynik wraca do `CrudForm`, który
 * pokazuje błędy przy polach.
 */
export function useEnterAccount(path: "/api/auth/login" | "/api/auth/register", next: string | undefined) {
  const router = useRouter();
  return async (values: unknown): Promise<ApiResult<SignedInAccount>> => {
    const result = await apiCall<SignedInAccount>(path, { method: "POST", body: values });
    if (result.ok) {
      router.replace(next ?? roleStartPath(result.data.roles));
    }
    return result;
  };
}
