import type { Metadata } from "next";
import { PageRoleGate } from "../../_lib/require-page-role";
import { DatabaseStatusCard } from "./database-status-card";

export const metadata: Metadata = {
  title: "Panel admina — DevMentor",
};

export default function AdminPage() {
  return (
    <PageRoleGate role="operator" path="/admin">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel admina</h1>
          <p className="text-sm text-muted-foreground">Stan usług aplikacji.</p>
        </div>
        <DatabaseStatusCard />
      </div>
    </PageRoleGate>
  );
}
