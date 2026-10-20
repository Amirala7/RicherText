import type { Metadata } from "next";
import { WelcomeView } from "./welcome-view";

export const metadata: Metadata = {
  title: "Activating your plan · RicherText",
};

// Stripe Checkout's success URL (ADR 0024, 0027).
export default function WelcomePage() {
  return (
    <main className="grid flex-auto place-items-center px-5 py-7">
      <WelcomeView />
    </main>
  );
}
