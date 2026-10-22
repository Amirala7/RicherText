import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Badge } from "@/components/atoms/badge";
import { Button, buttonVariants } from "@/components/atoms/button";
import { Notice } from "@/components/molecules/notice";
import { SettingsList, SettingsRow } from "@/components/molecules/settings-row";
import { formatPlanDate, type AccountPlan } from "@/lib/billing/account-plan";
import { cn } from "@/lib/utils";

// Account organism (ADR 0016, 0024): sections of settings rows, lg heading,
// gap s-3. Everything about a paid subscription opens the Stripe Customer
// Portal (ADR 0027). The writing font is picked per document in the editor
// (ADR 0032); changing email or password later (2026-10-21).
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-3">
      <h2 id={id} className="m-0 text-lg">
        {title}
      </h2>
      <SettingsList>{children}</SettingsList>
    </section>
  );
}

export function ProfileSection({ email }: { email: string | null }) {
  return (
    <Section title="Profile">
      <SettingsRow label="Email" value={email ?? ""} />
    </Section>
  );
}

const PORTAL_ACTION = {
  active: "Manage",
  ends: "Resubscribe",
  "payment-due": "Update card",
} as const;

export function SubscriptionSection({
  state,
  now,
  pending = false,
  onPortal,
}: {
  state: AccountPlan;
  now: Date;
  pending?: boolean;
  onPortal: () => void;
}) {
  const date = (d: Date | null) => (d ? formatPlanDate(d, now) : null);

  let chip: React.ReactNode = null;
  let value: string;
  if (state.kind === "free") {
    chip = <Badge size="chip">Free</Badge>;
    value = "One document, plain text";
  } else if (state.kind === "active") {
    const renews = date(state.renewsOn);
    value = state.planName ?? "Paid";
    if (renews) value += `, renews ${renews}`;
  } else if (state.kind === "ends") {
    const ends = date(state.endsOn);
    chip = (
      <Badge tone="warning" size="chip">
        {ends ? `Ends ${ends}` : "Ending"}
      </Badge>
    );
    value = state.planName ?? "Paid";
  } else {
    chip = (
      <Badge tone="warning" size="chip">
        Payment due
      </Badge>
    );
    value = state.planName ?? "Paid";
  }

  const action =
    state.kind === "free" ? (
      <Link
        href="/plans"
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
      >
        Upgrade
      </Link>
    ) : (
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={onPortal}
      >
        {PORTAL_ACTION[state.kind]}
      </Button>
    );

  return (
    <Section title="Subscription">
      <SettingsRow label="Plan" chip={chip} value={value} action={action} />
    </Section>
  );
}

export function PaymentDueNotice() {
  return (
    <Notice
      tone="warning"
      icon={<TriangleAlert strokeWidth={1.75} aria-hidden />}
    >
      Your last payment didn&apos;t go through. Stripe will try again; update
      your card to keep your plan.
    </Notice>
  );
}
