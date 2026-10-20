import { cn } from "@/lib/utils";

// App loader (ADR 0012): "Aa" + three dots. lg is 64px (activation page),
// sm 28px. Decorative: the page around it says what's happening.
const sizes = {
  lg: { box: "gap-[18px]", aa: "text-[64px]", dots: "gap-2", dot: "size-2" },
  sm: { box: "gap-2", aa: "text-[28px]", dots: "gap-1", dot: "size-1" },
};

export function Loader({
  size = "lg",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex flex-col items-center", s.box, className)}
    >
      <span
        className={cn(
          "rt-aa inline-block leading-none font-extralight tracking-[-0.03em]",
          s.aa,
        )}
      >
        Aa
      </span>
      <span className={cn("inline-flex", s.dots)}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("rt-dot block rounded-full bg-current", s.dot)}
          />
        ))}
      </span>
    </span>
  );
}
