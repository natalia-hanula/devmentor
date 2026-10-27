import type { Metadata } from "next";
import { PageRoleGate } from "../../../_lib/require-page-role";
import { InvitationsManager } from "./invitations-manager";

export const metadata: Metadata = {
  title: "Zaproszenia — Panel admina — DevMentor",
};

export default function InvitationsPage() {
  return (
    <PageRoleGate role="operator" path="/admin/invitations">
      <div className="flex flex-col gap-between-groups">
        <h1 className="text-page-title">Zaproszenia</h1>
        <InvitationsManager />
      </div>
    </PageRoleGate>
  );
}
