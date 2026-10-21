import type { Metadata } from "next";
import { PageRoleGate } from "../../../_lib/require-page-role";
import { OutboxViewer } from "./outbox-viewer";

export const metadata: Metadata = {
  title: "Skrzynka — Panel admina — DevMentor",
};

export default function OutboxPage() {
  return (
    <PageRoleGate role="operator" path="/admin/outbox">
      <div className="flex flex-col gap-between-groups">
        <h1 className="text-page-title">Skrzynka</h1>
        <OutboxViewer />
      </div>
    </PageRoleGate>
  );
}
