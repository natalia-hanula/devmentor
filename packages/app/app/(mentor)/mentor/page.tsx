import type { Metadata } from "next";
import { PageRoleGate } from "../../_lib/require-page-role";
import { MentorHome } from "./mentor-home";

export const metadata: Metadata = {
  title: "Panel mentora — DevMentor",
};

/** s09: strona startowa mentora; bez roli — „Brak dostępu” (403), gość — przekierowanie na `/login?next=/mentor`. */
export default function MentorPage() {
  return (
    <PageRoleGate role="mentor" path="/mentor">
      <div className="flex flex-col gap-between-groups">
        <h1 className="text-page-title">Panel mentora</h1>
        <MentorHome />
      </div>
    </PageRoleGate>
  );
}
