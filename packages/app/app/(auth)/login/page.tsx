import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "../auth-card";
import { LoginContent } from "./login-content";

export const metadata: Metadata = {
  title: "Zaloguj się — DevMentor",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard title="Zaloguj się">
      <Suspense fallback={<LoadingMessage />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
