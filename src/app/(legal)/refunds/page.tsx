import type { Metadata } from "next";
import { LegalText } from "@/components/organisms/legal-text";

export const metadata: Metadata = { title: "Refund policy · RicherText" };

export default function RefundsPage() {
  return (
    <LegalText
      title="Refund policy"
      updated="21 October 2026"
      sections={[
        {
          heading: "Try it free first",
          body: [
            "The Free plan has the full editor, so you can see whether RicherText suits you before paying.",
          ],
        },
        {
          heading: "Cancelling",
          body: [
            "Cancel any time from your account page. You keep paid access until the end of the period you paid for, and you won't be charged again.",
          ],
        },
        {
          heading: "Refunds",
          body: [
            "If you're charged for a renewal you didn't mean to keep, ask within 14 days and we'll refund it in full. Refunds go back to the original card through Stripe.",
          ],
        },
        {
          heading: "Your documents after cancelling",
          body: [
            "Nothing is deleted. Your most recent document stays editable and the rest become read-only until you subscribe again.",
          ],
        },
      ]}
    />
  );
}
