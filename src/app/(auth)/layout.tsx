import { PageBar } from "@/components/organisms/page-bar";
import { SiteFooter } from "@/components/organisms/site-footer";

// Auth page template (ADR 0024): logotype bar, the card centred in the space left, footer.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PageBar />
      <main className="grid flex-1 place-items-center px-5 py-7 max-sm:px-4 max-sm:py-5">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
