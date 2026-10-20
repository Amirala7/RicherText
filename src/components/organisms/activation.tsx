import NextLink from "next/link";
import { buttonVariants } from "@/components/atoms/button";
import { Loader } from "@/components/atoms/loader";
import { cn } from "@/lib/utils";

export type ActivationState = "waiting" | "done" | "slow";

// Back from Checkout (ADR 0024): mark box 120px (loader, then the check
// circle) and a text group (lg title, sm muted line), gap s-5. All states are
// stacked in the same boxes and the button's space is kept, so nothing moves
// (ADR 0013). Screen readers get the current text from one status region.
function texts(state: ActivationState, planName?: string) {
  if (state === "done") {
    return {
      title: planName ? `You're on ${planName}` : "Your plan is active",
      line: "Taking you to your documents…",
    };
  }
  if (state === "slow") {
    return {
      title: "Still waiting on Stripe",
      line: "Your plan switches on by itself as soon as Stripe confirms.",
    };
  }
  return {
    title: "Activating your plan",
    line: "Waiting for Stripe to confirm. This takes a few seconds.",
  };
}

const layers: ActivationState[] = ["waiting", "done", "slow"];

export function Activation({
  state,
  planName,
}: {
  state: ActivationState;
  planName?: string;
}) {
  const current = texts(state, planName);
  return (
    <div
      data-state={state}
      className="grid justify-items-center gap-5 text-center"
    >
      <div aria-hidden="true" className="grid size-[120px] place-items-center">
        <Loader className="rt-act-wait [grid-area:1/1]" />
        <span className="rt-act-ok size-[72px] [grid-area:1/1]">
          <svg viewBox="0 0 64 64" className="size-full">
            <circle
              cx="32"
              cy="32"
              r="30"
              className="fill-[color-mix(in_oklab,var(--primary)_14%,transparent)]"
            />
            <path
              d="M20 33 28.5 41.5 45 24"
              fill="none"
              className="stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <div aria-hidden="true" className="grid">
        {layers.map((layer) => {
          const t = texts(layer, planName);
          return (
            <div
              key={layer}
              className={cn(
                "rt-act-text grid content-start gap-1 [grid-area:1/1]",
                layer !== state && "opacity-0",
              )}
            >
              <strong className="text-lg">{t.title}</strong>
              <span className="text-sm text-muted-foreground">{t.line}</span>
            </div>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {current.title}. {current.line}
      </p>
      <div
        data-slot="action"
        className={cn("h-control-md", state !== "slow" && "invisible")}
      >
        {state === "slow" && (
          <NextLink
            href="/documents"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Go to documents
          </NextLink>
        )}
      </div>
    </div>
  );
}
