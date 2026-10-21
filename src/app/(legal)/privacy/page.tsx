import type { Metadata } from "next";
import { LegalText } from "@/components/organisms/legal-text";

export const metadata: Metadata = { title: "Privacy policy · RicherText" };

export default function PrivacyPage() {
  return (
    <LegalText
      title="Privacy policy"
      updated="21 October 2026"
      sections={[
        {
          heading: "What we collect",
          body: [
            "Your email address and password (stored by Firebase Authentication), the documents you write, and your settings such as the writing font.",
            "Payments are handled by Stripe. We never see or store your card details; we keep only your plan and its status.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "To run the editor: sign you in, save your documents and apply your plan. Nothing else. No advertising and no selling of data.",
          ],
        },
        {
          heading: "Where it's kept",
          body: [
            "Documents and account data live in Google Firebase. A copy of your documents is cached in your browser so the editor works offline; it's deleted when you sign out.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "One session cookie keeps you signed in. There are no tracking or advertising cookies.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            "You can ask for a copy of your data or for your account to be deleted at any time.",
          ],
        },
      ]}
    />
  );
}
