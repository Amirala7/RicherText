import {
  collection,
  doc,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";
import { accountPlan, type AccountPlan } from "./account-plan";

// Follows the user's own `customers/{uid}` and its subscriptions (rules allow
// reading them, ADR 0027), so the account page shows what the webhook writes
// after a change in the Portal without a reload. Returns the unsubscribe
// function.
export function watchAccountPlan(
  db: Firestore,
  uid: string,
  onChange: (state: AccountPlan) => void,
) {
  let plan: unknown;
  let subs: Parameters<typeof accountPlan>[1] | null = null;
  let customerSeen = false;
  const emit = () => {
    if (customerSeen && subs) onChange(accountPlan(plan, subs));
  };
  // A failed listen keeps what the server rendered.
  const stopCustomer = onSnapshot(
    doc(db, "customers", uid),
    (snap) => {
      plan = snap.get("plan");
      customerSeen = true;
      emit();
    },
    () => {},
  );
  const stopSubs = onSnapshot(
    collection(db, "customers", uid, "subscriptions"),
    (snap) => {
      subs = snap.docs.map((d) => ({
        status: String(d.get("status")),
        interval: d.get("interval") ?? null,
        cancelAtPeriodEnd: d.get("cancelAtPeriodEnd") === true,
        currentPeriodEnd: d.get("currentPeriodEnd")?.toDate() ?? null,
      }));
      emit();
    },
    () => {},
  );
  return () => {
    stopCustomer();
    stopSubs();
  };
}
