import Link from "next/link";

/**
 * Layout stron kont (luka DS05): publiczne tło i odstępy z tokenów, nazwa serwisu nad wąską kartą
 * (`AuthCard` na każdej stronie). Bez nagłówka zalogowanego — e01 dochodzi w fazie 4 (L21).
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col items-center gap-between-groups bg-muted/40 px-between-groups py-section-public">
      <Link href="/" className="text-section-title">
        DevMentor
      </Link>
      {children}
    </div>
  );
}
