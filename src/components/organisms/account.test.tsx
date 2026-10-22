import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PaymentDueNotice,
  ProfileSection,
  SubscriptionSection,
} from "./account";

// Account page sections (ADR 0016, 0024): Profile shows the email (no change
// yet, 2026-10-21); Subscription has one row per state; everything about
// a paid subscription opens the Stripe Customer Portal (ADR 0027).
const now = new Date("2026-10-21T09:00:00Z");
const nov19 = new Date("2026-11-19T12:00:00Z");

function planRow() {
  const section = screen.getByRole("region", { name: "Subscription" });
  return within(section);
}

describe("ProfileSection", () => {
  it("shows the email, with nothing to change yet", () => {
    render(<ProfileSection email="maya@studio.co" />);
    const section = within(screen.getByRole("region", { name: "Profile" }));
    expect(section.getByText("Email")).toBeInTheDocument();
    expect(section.getByText("maya@studio.co")).toBeInTheDocument();
    expect(section.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("SubscriptionSection", () => {
  it("on Free, shows the Free chip and Upgrade to the plans page", () => {
    render(
      <SubscriptionSection
        state={{ kind: "free" }}
        now={now}
        onPortal={() => {}}
      />,
    );
    const row = planRow();
    expect(row.getByText("Plan")).toBeInTheDocument();
    expect(row.getByText("Free")).toBeInTheDocument();
    expect(row.getByText("One document, plain text")).toBeInTheDocument();
    expect(row.getByRole("link", { name: "Upgrade" })).toHaveAttribute(
      "href",
      "/plans",
    );
    expect(row.queryByRole("button")).not.toBeInTheDocument();
  });

  it("when active, names the plan and its renewal, and Manage opens the Portal", () => {
    const onPortal = vi.fn();
    render(
      <SubscriptionSection
        state={{ kind: "active", planName: "Yearly", renewsOn: nov19 }}
        now={now}
        onPortal={onPortal}
      />,
    );
    const row = planRow();
    expect(row.getByText("Yearly, renews 19 Nov")).toBeInTheDocument();
    fireEvent.click(row.getByRole("button", { name: "Manage" }));
    expect(onPortal).toHaveBeenCalledOnce();
  });

  it("when active without a known plan, still offers Manage", () => {
    render(
      <SubscriptionSection
        state={{ kind: "active", planName: null, renewsOn: null }}
        now={now}
        onPortal={() => {}}
      />,
    );
    expect(planRow().getByText("Paid")).toBeInTheDocument();
    expect(planRow().getByRole("button", { name: "Manage" })).toBeEnabled();
  });

  it("when cancelled, shows the end date and Resubscribe opens the Portal", () => {
    const onPortal = vi.fn();
    render(
      <SubscriptionSection
        state={{ kind: "ends", planName: "Yearly", endsOn: nov19 }}
        now={now}
        onPortal={onPortal}
      />,
    );
    const row = planRow();
    expect(row.getByText("Ends 19 Nov")).toBeInTheDocument();
    expect(row.getByText("Yearly")).toBeInTheDocument();
    fireEvent.click(row.getByRole("button", { name: "Resubscribe" }));
    expect(onPortal).toHaveBeenCalledOnce();
  });

  it("when a payment failed, Update card opens the Portal", () => {
    const onPortal = vi.fn();
    render(
      <SubscriptionSection
        state={{ kind: "payment-due", planName: "Monthly" }}
        now={now}
        onPortal={onPortal}
      />,
    );
    const row = planRow();
    expect(row.getByText("Payment due")).toBeInTheDocument();
    expect(row.getByText("Monthly")).toBeInTheDocument();
    fireEvent.click(row.getByRole("button", { name: "Update card" }));
    expect(onPortal).toHaveBeenCalledOnce();
  });

  it("shows the button loading while the Portal opens, same size", () => {
    render(
      <SubscriptionSection
        state={{ kind: "active", planName: "Yearly", renewsOn: nov19 }}
        now={now}
        pending
        onPortal={() => {}}
      />,
    );
    const button = planRow().getByRole("button", { name: "Manage" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });
});

describe("PaymentDueNotice", () => {
  it("says the payment failed and how to keep the plan", () => {
    render(<PaymentDueNotice />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your last payment didn't go through. Stripe will try again; update your card to keep your plan.",
    );
  });
});
