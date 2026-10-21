import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";
// One plan rule for the webhook and the app: imported straight from the
// Functions package instead of a shared workspace package, to keep one copy
// without a third package to build and deploy.
import { planFor } from "../../../functions/src/billing/plan";
import { planNameForInterval } from "./plans";

// Calls onPaid once the webhook has made the user's plan paid (ADR 0027),
// with the plan's name ("Yearly") when a paid subscription says which.
// Returns the unsubscribe function.
export function watchPaidPlan(
  db: Firestore,
  uid: string,
  onPaid: (planName: string | null) => void,
) {
  return onSnapshot(
    doc(db, "customers", uid),
    async (snap) => {
      if (snap.get("plan") !== "paid") return;
      const subs = await getDocs(
        collection(db, "customers", uid, "subscriptions"),
      );
      const paid = subs.docs.find((d) => planFor(d.get("status")) === "paid");
      onPaid(planNameForInterval(paid?.get("interval")));
    },
    // A failed listen leaves the page waiting; after 20s it offers a way on.
    () => {},
  );
}
