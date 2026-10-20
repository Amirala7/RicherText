"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { inputClasses } from "./input";

// Input with a trailing show/hide button: ghost sm icon button inset 2px (ADR 0015).
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="relative">
      <input
        type={shown ? "text" : "password"}
        className={cn(inputClasses, "pr-(--spacing-control-md)", className)}
        {...props}
      />
      <Button
        variant="ghost"
        size="sm"
        icon
        className="absolute top-0.5 right-0.5 text-muted-foreground hover:text-foreground"
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => setShown((s) => !s)}
      >
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      </Button>
    </div>
  );
}
