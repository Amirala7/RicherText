// Empty state molecule (ADR 0015): lg title + sm muted line, then the action.
export function EmptyState({
  title,
  line,
  action,
}: {
  title: string;
  line: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-4 rounded-lg border border-border p-5 text-center">
      <div className="grid gap-1">
        <strong className="text-lg">{title}</strong>
        <span className="text-sm text-muted-foreground">{line}</span>
      </div>
      {action}
    </div>
  );
}
