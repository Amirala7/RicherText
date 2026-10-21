"use client";

import { Check, FileText, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/atoms/button";
import {
  menuContent,
  menuIcon as icon,
  menuItem as item,
  menuLabel as label,
  menuSeparator as separator,
} from "@/components/molecules/menu";
import { signOut } from "@/lib/auth/client";

// Account menu (ADR 0024); drops s-1 under the bar (button centred in h-bar:
// 14px + 4px). The editor bar sizes the button to its row and passes its own
// offset.
export function AccountMenu({
  email,
  triggerClassName,
  sideOffset = 18,
}: {
  email: string | null;
  triggerClassName?: string;
  sideOffset?: number;
}) {
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
        <Button
          variant="ghost"
          icon
          aria-label="Account menu"
          className={triggerClassName}
        >
          <User className="size-4" {...icon} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={sideOffset}
          className={`${menuContent} w-[220px] max-w-[calc(100vw-32px)]`}
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
