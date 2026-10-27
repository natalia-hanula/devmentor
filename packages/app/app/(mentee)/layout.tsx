import { SignedInHeader } from "../_lib/signed-in-header";

/**
 * Layout stron mentee (`/account`, strona startowa mentee — L03): nagłówek zalogowanego (e01) nad wąską kartą,
 * jak na stronach `(auth)`, ale bez publicznego nagłówka serwisu (nazwa serwisu jest w nagłówku zalogowanego).
 */
export default function MenteeLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <SignedInHeader />
      <div className="flex flex-1 flex-col items-center px-between-groups py-section-public">{children}</div>
    </div>
  );
}
