// LUKA DS03: brak komponentu Separator z napisem „lub” — dwie linie z tokenu --border.
export function OrSeparator() {
  return (
    <div className="flex items-center gap-in-group text-meta text-muted-foreground" role="separator" aria-label="lub">
      <span className="flex-1 border-t" aria-hidden="true" />
      <span aria-hidden="true">lub</span>
      <span className="flex-1 border-t" aria-hidden="true" />
    </div>
  );
}
