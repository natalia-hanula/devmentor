import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { InviteView } from "./invite-view";

export const metadata: Metadata = {
  title: "Zaproszenie do roli mentora — DevMentor",
};

/** s08: link z maila (`/invite#token=…`). Strona publiczna; cała logika w komponencie klienckim (fragment URL). */
export default function InvitePage() {
  return (
    <AuthCard title="Zaproszenie do roli mentora">
      <InviteView />
    </AuthCard>
  );
}
