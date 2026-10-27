/** Layout panelu mentora. Wspólny nagłówek zalogowanego (e01, L21) dochodzi w zadaniu 4.7. */
export default function MentorLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
