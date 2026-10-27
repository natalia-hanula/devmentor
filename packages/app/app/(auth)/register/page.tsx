import { LoadingMessage } from "@devmentor/ui/backend/feedback/loading-message";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "../auth-card";
import { RegisterContent } from "./register-content";

export const metadata: Metadata = {
  title: "Załóż konto — DevMentor",
};

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return (
    <AuthCard title="Załóż konto">
      <Suspense fallback={<LoadingMessage />}>
        <RegisterContent searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
