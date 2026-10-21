import { Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useId } from "react";
import { Badge } from "@/components/atoms/badge";
import { Button, buttonVariants } from "@/components/atoms/button";
import {
  menuContent,
  menuIcon as icon,
  menuItem as item,
} from "@/components/molecules/menu";
import { Notice } from "@/components/molecules/notice";
import { SettingsList, SettingsRow } from "@/components/molecules/settings-row";
import { formatPlanDate, type AccountPlan } from "@/lib/billing/account-plan";
import {
  WRITING_FONTS,
  fontLabel,
  writingFont,
  type WritingFont,
} from "@/lib/settings/writing";
import { cn } from "@/lib/utils";

// Account organism (ADR 0016, 0024): sections of settings rows, lg heading,
// gap s-3. Everything about a paid subscription opens the Stripe Customer
// Portal (ADR 0027). Writing holds the writing font (ADR 0031); changing
// email or password later (user, 2026-10-21).
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

// Change opens the fonts as checked items, like Theme in the account menu.
export function WritingSection({
  font,
  onFont,
}: {
  font: WritingFont;
  onFont: (font: WritingFont) => void;
}) {
  const action = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm">
          Change
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(menuContent, "w-[200px]")}
        >
          <DropdownMenu.RadioGroup
            value={font}
            onValueChange={(value) => onFont(writingFont(value))}
          >
            {WRITING_FONTS.map((f) => (
              <DropdownMenu.RadioItem
                key={f.id}
                value={f.id}
                className={`${item} [&>svg]:invisible [&>svg]:text-foreground data-[state=checked]:[&>svg]:visible`}
              >
                <Check {...icon} />
                <span className="min-w-0 flex-1 truncate">{f.label}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
  return (
    <Section title="Writing">
      <SettingsRow
        label="Writing font"
        value={fontLabel(font)}
        action={action}
      />
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
    value = "One document at a time";
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
