import { SessionKeeper } from "@/components/organisms/session-keeper";
import { requireUser } from "@/lib/auth/session";

// The editor has its own bar (ADR 0024), so it sits outside the app layout,
// behind the same session check (ADR 0026).
export const instant = false;

export default async function EditorLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <SessionKeeper />
      {children}
    </>
  );
}
