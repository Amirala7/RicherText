import { Badge } from "@/components/atoms/badge";
import { FeatureList, PriceLine } from "@/components/molecules/price-line";
import {
  PAID_PLANS,
  formatUsd,
  monthlyEquivalent,
  yearlySavingPercent,
} from "@/lib/billing/plans";

// Pricing block (ADR 0016, 0020, 0023, 0024): the landing pricing section,
// used as is in the app. Three cards with the same parts in the same order
// (name row h-sm, price, features, action, note), so they share one height;
// one column at 900px and under. Callers pass each card's button.
const paidFeatures = [
  "Everything in Free",
  "Unlimited documents",
  "Export to PDF, Word and more",
  "Cancel any time",
];

function PlanCard({
  name,
  chip,
  price,
  per,
  features,
  action,
  note,
}: {
  name: string;
  chip?: string;
  price: string;
  per: string;
  features: string[];
  action: React.ReactNode;
  note: string;
}) {
  return (
    <li
      aria-label={`${name} plan`}
      className="flex min-w-0 flex-col gap-5 rounded-lg border border-border p-6 max-sm:gap-4 max-sm:p-5 [&>button]:w-full"
    >
      <div className="flex h-control-sm items-center justify-between gap-3">
        <strong className="text-lg leading-none">{name}</strong>
        {chip && (
          <Badge tone="primary" size="chip">
            {chip}
          </Badge>
        )}
      </div>
      <PriceLine amount={price} per={per} />
      <FeatureList items={features} />
      {action}
      <p className="m-0 text-xs text-muted-foreground">{note}</p>
    </li>
  );
}

export function PricingBlock({
  free,
  yearly,
  monthly,
}: {
  free: React.ReactNode;
  yearly: React.ReactNode;
  monthly: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="pricing-title"
      className="flex flex-col items-center gap-6 px-7 py-24 max-sm:gap-5 max-sm:px-5 max-sm:py-16"
    >
      <div className="flex max-w-[760px] flex-col items-center gap-5 text-center max-sm:gap-4">
        <h1
          id="pricing-title"
          className="m-0 text-3xl text-balance [text-box:trim-both_cap_alphabetic]"
        >
          Simple pricing
        </h1>
        <p className="m-0 text-lg font-normal text-balance text-muted-foreground [text-box:trim-both_cap_alphabetic] max-sm:text-base max-sm:tracking-normal">
          Start free with one document. Subscribe when you need more.
        </p>
      </div>
      <ul className="m-0 grid w-full max-w-[1080px] list-none grid-cols-3 items-stretch gap-5 p-0 max-[900px]:mx-auto max-[900px]:max-w-[420px] max-[900px]:grid-cols-1">
        <PlanCard
          name="Free"
          price="$0"
          per="for good"
          features={[
            "The full editor, every format",
            "One document at a time",
            "Saves as you type",
            "No card needed",
          ]}
          action={free}
          note="Upgrade any time from inside the app."
        />
        <PlanCard
          name={PAID_PLANS.yearly.name}
          chip={`Save ${yearlySavingPercent()}%`}
          price={formatUsd(PAID_PLANS.yearly.amount)}
          per="a year"
          features={paidFeatures}
          action={yearly}
          note={`Works out at ${monthlyEquivalent(PAID_PLANS.yearly)} a month.`}
        />
        <PlanCard
          name={PAID_PLANS.monthly.name}
          price={formatUsd(PAID_PLANS.monthly.amount)}
          per="a month"
          features={paidFeatures}
          action={monthly}
          note="Billed monthly through Stripe."
        />
      </ul>
    </section>
  );
}
