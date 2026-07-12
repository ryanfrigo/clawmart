import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

/**
 * Chrome for clawmart's own pages. Generated company sites (/c/[slug]) live
 * OUTSIDE this group on purpose — they are standalone sites with their own
 * identity, not pages inside clawmart's shell.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
