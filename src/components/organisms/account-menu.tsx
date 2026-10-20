"use client";

import { Check, FileText, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/atoms/button";
import { signOut } from "@/lib/auth/client";

const item =
  "flex h-control-sm w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left text-sm text-foreground outline-none transition-colors duration-(--dur-1) ease-standard data-highlighted:bg-secondary [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";
const label =
  "flex h-control-sm min-w-0 items-center px-3 text-xs text-muted-foreground";
const separator = "-mx-1 my-1 h-px bg-border";
const icon = { strokeWidth: 1.75, "aria-hidden": true } as const;

// Account menu (ADR 0024); drops s-1 under the bar (button centred in h-bar:
// 14px + 4px).
export function AccountMenu({ email }: { email: string | null }) {
  const router = useRouter();
  const { theme = "system", setTheme } = useTheme();

  async function handleSignOut() {
    await signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" icon aria-label="Account menu">
          <User className="size-4" {...icon} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={18}
          className="z-50 grid w-[220px] max-w-[calc(100vw-32px)] gap-0 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-[0_8px_24px_-8px_rgb(0_0_0/.22),0_2px_6px_-2px_rgb(0_0_0/.08)]"
        >
          {email && (
            <DropdownMenu.Label className={label}>
              <span className="min-w-0 truncate">{email}</span>
            </DropdownMenu.Label>
          )}
          <DropdownMenu.Item
            className={item}
            onSelect={() => router.push("/documents")}
          >
            <FileText {...icon} />
            <span className="min-w-0 flex-1 truncate">Documents</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={item}
            onSelect={() => router.push("/account")}
          >
            <User {...icon} />
            <span className="min-w-0 flex-1 truncate">Account</span>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={separator} />
          <DropdownMenu.Label className={label}>Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme}>
            {(["system", "light", "dark"] as const).map((value) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className={`${item} [&>svg]:invisible [&>svg]:text-foreground data-[state=checked]:[&>svg]:visible`}
              >
                <Check {...icon} />
                <span className="min-w-0 flex-1 truncate capitalize">
                  {value}
                </span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className={separator} />
          <DropdownMenu.Item className={item} onSelect={handleSignOut}>
            <LogOut {...icon} />
            <span className="min-w-0 flex-1 truncate">Sign out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
