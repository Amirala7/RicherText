import { NavLink } from "@/components/atoms/text-link";
import { AccountMenu } from "@/components/organisms/account-menu";
import { PageBar } from "@/components/organisms/page-bar";
import { SessionKeeper } from "@/components/organisms/session-keeper";
import { requireUser } from "@/lib/auth/session";

// Every app page sits behind the real session check (ADR 0026). It blocks on
// the server on purpose: nothing gated renders before the check passes.
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <PageBar>
        <nav aria-label="App" className="flex items-center gap-5 max-sm:gap-3">
          <NavLink href="/documents" className="max-sm:hidden">
            Documents
          </NavLink>
          <NavLink href="/account" className="max-sm:hidden">
            Account
          </NavLink>
          <AccountMenu email={user.email} />
        </nav>
      </PageBar>
      <SessionKeeper />
      {children}
    </div>
  );
}
