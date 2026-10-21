import { Check } from "lucide-react";
import { Badge } from "@/components/atoms/badge";

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

// An item can carry a badge after its text, e.g. "Coming soon".
export type Feature = string | { text: string; badge: string };

export function FeatureList({ items }: { items: Feature[] }) {
  return (
    <ul className="m-0 grid flex-auto list-none content-start gap-2 p-0">
      {items.map((item) => {
        const { text, badge } =
          typeof item === "string" ? { text: item, badge: undefined } : item;
        return (
          <li key={text} className="flex items-start gap-2 text-sm">
            <Check
              className="mt-0.5 size-4 shrink-0 text-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            {badge ? (
              // Stacked under the text: never side by side with it (rule 1).
              <span className="flex flex-col items-start gap-1">
                <span>{text}</span>
                <Badge tone="primary">{badge}</Badge>
              </span>
            ) : (
              text
            )}
          </li>
        );
      })}
    </ul>
  );
}
