import type { Metadata } from "next";
import { TechnologiesManager } from "./technologies-manager";

export const metadata: Metadata = {
  title: "Technologie — Panel admina — DevMentor",
};

export default function TechnologiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Technologie</h1>
        <p className="text-sm text-muted-foreground">
          Słownik technologii, którymi mentorzy opisują swój profil.
        </p>
      </div>
      <TechnologiesManager />
    </div>
  );
}
