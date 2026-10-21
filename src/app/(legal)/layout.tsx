import { PageBar } from "@/components/organisms/page-bar";
import { SiteFooter } from "@/components/organisms/site-footer";

// Legal pages (Phase 5): logotype bar, a text column, footer. Built from the
// auth template's pieces; static, public.
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PageBar />
      <main className="flex-1 px-6 py-12 max-sm:px-4 max-sm:py-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
