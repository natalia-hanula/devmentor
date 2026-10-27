import { SignedInHeader } from "../_lib/signed-in-header";

/** Layout panelu mentora: nagłówek zalogowanego (e01, L21) nad treścią strony. */
export default function MentorLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <SignedInHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
