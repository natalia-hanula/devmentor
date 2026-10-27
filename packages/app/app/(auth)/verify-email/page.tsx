import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { VerifyEmailView } from "./verify-email-view";

export const metadata: Metadata = {
  title: "Potwierdzenie adresu e-mail — DevMentor",
};

/** s05: link z maila (`/verify-email#token=…`). Strona publiczna; cała logika w komponencie klienckim (fragment URL). */
export default function VerifyEmailPage() {
  return (
    <AuthCard title="Potwierdzenie adresu e-mail">
      <VerifyEmailView />
    </AuthCard>
  );
}
