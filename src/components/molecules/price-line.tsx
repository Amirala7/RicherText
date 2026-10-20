import { Check } from "lucide-react";

// Price line + feature item (ADR 0015): amount 3xl 600 and the period sm muted
// on one baseline; feature = check icon + sm text, gap s-2.
export function PriceLine({ amount, per }: { amount: string; per: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[50px] leading-[1.1] font-semibold tracking-[-0.03em] tabular-nums">
        {amount}
      </span>
      <span className="text-sm text-muted-foreground">{per}</span>
    </div>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 grid flex-auto list-none content-start gap-2 p-0">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm">
          <Check
            className="size-4 shrink-0 text-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
