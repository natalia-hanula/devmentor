import type { Metadata } from "next";
import { AuthCard } from "../../(auth)/auth-card";
import { AccountView } from "./account-view";

export const metadata: Metadata = {
  title: "Konto — DevMentor",
};

/**
 * Strona startowa mentee (L03). Gościa bez ciasteczka odsyła `proxy.ts`; dane i autorytet to
 * `GET /api/auth/me` (401 → „Sesja wygasła”, decyzja 17). W etapie A nazwa tylko do odczytu dla każdego.
 */
export default function AccountPage() {
  return (
    <AuthCard title="Konto">
      <AccountView />
    </AuthCard>
  );
}
