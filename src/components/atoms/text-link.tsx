import NextLink from "next/link";
import { cn } from "@/lib/utils";

// Link atoms (ADR 0013): inline links in violet, underlined; nav links muted until hover or current.
export const linkClasses =
  "rounded-[2px] text-primary underline decoration-1 underline-offset-3 transition-[text-decoration-thickness] duration-(--dur-1) ease-standard hover:decoration-2";

export const navLinkClasses =
  "inline-flex h-control-md items-center rounded-[2px] text-sm font-medium text-muted-foreground no-underline transition-colors duration-(--dur-1) ease-standard hover:text-foreground focus-visible:outline-offset-3 aria-[current=page]:text-foreground";

export function TextLink({
  className,
  ...props
}: React.ComponentProps<typeof NextLink>) {
  return <NextLink className={cn(linkClasses, className)} {...props} />;
}

export function NavLink({
  className,
  ...props
}: React.ComponentProps<typeof NextLink>) {
  return <NextLink className={cn(navLinkClasses, className)} {...props} />;
}
