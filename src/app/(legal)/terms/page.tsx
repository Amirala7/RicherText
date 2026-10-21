import type { Metadata } from "next";
import { LegalText } from "@/components/organisms/legal-text";

export const metadata: Metadata = { title: "Terms of service · RicherText" };

export default function TermsPage() {
  return (
    <LegalText
      title="Terms of service"
      updated="21 October 2026"
      sections={[
        {
          heading: "Using RicherText",
          body: [
            "By creating an account you agree to these terms. You must be old enough to form a contract where you live, and you're responsible for keeping your password safe.",
          ],
        },
        {
          heading: "Your documents",
          body: [
            "What you write stays yours. We store it only to show it back to you and keep it saved. We don't read, share or sell your documents.",
          ],
        },
        {
          heading: "Plans and billing",
          body: [
            "The Free plan keeps one document at a time. Paid plans are billed yearly or monthly through Stripe and renew until you cancel. You can cancel any time from your account page; access continues to the end of the paid period.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Don't use RicherText to break the law, to harm others, or to disrupt the service.",
          ],
        },
        {
          heading: "No warranty",
          body: [
            "RicherText is provided as is. We work to keep it available and your work safe, but we can't promise it will never be interrupted.",
          ],
        },
        {
          heading: "Changes",
          body: [
            "We may update these terms. If a change matters, we'll tell you before it takes effect.",
          ],
        },
      ]}
    />
  );
}
