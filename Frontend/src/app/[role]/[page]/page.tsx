import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/PageHeader";
import { MarketplacePage } from "@/components/templates/MarketplacePage";
import { PortfolioPage } from "@/components/templates/PortfolioPage";
import { WalletPage } from "@/components/templates/WalletPage";
import { ROLES, isRole } from "@/lib/roles";

// Real pages register here as "role/slug"; every other nav item falls back to the placeholder.
// `demo` (pending | frozen | empty) only has an effect when NEXT_PUBLIC_DEMO_DATA=1.
const PAGES: Record<string, ComponentType<{ demo?: string }>> = {
  "investor/marketplace": MarketplacePage,
  "investor/portfolio": PortfolioPage,
  "investor/wallet": WalletPage,
};

export default async function RolePage({ params, searchParams }: PageProps<"/[role]/[page]">) {
  const { role, page } = await params;
  const { demo } = await searchParams;
  const item = isRole(role) && ROLES[role].nav.find((n) => n.slug === page);
  if (!item) notFound();
  const Page = PAGES[`${role}/${page}`];
  return Page ? <Page demo={typeof demo === "string" ? demo : undefined} /> : <PageHeader title={item.label} description="Coming soon." />;
}
