// Settings row molecule (ADR 0015): key sm muted in a fixed column, value on
// one line with "…", an optional h-sm chip and button sm. Under 440px the key
// moves onto its own line. The action is optional: a row can only show a
// value (user, 2026-10-21).
export function SettingsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container grid min-w-0 overflow-hidden rounded-lg border border-border [&>*+*]:border-t [&>*+*]:border-border">
      {children}
    </div>
  );
}

export function SettingsRow({
  label,
  value,
  chip,
  action,
}: {
  label: string;
  value: React.ReactNode;
  chip?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-control-lg min-w-0 items-center gap-3 bg-background px-4 @max-[440px]:h-auto @max-[440px]:flex-wrap @max-[440px]:p-4">
      <span className="inline-flex h-control-sm w-[clamp(88px,28cqi,140px)] flex-none items-center text-sm whitespace-nowrap text-muted-foreground @max-[440px]:h-auto @max-[440px]:w-full @max-[440px]:leading-[1.4]">
        {label}
      </span>
      <span className="inline-flex h-control-sm min-w-0 flex-auto items-center gap-3 overflow-hidden text-sm whitespace-nowrap tabular-nums">
        {chip}
        <span className="min-w-0 truncate">{value}</span>
      </span>
      {action}
    </div>
  );
}
