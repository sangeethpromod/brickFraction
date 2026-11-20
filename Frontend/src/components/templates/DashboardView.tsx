"use client";
import { useState } from "react";
import { Section, Unavailable } from "@/components/molecules/Section";
import { MarketplaceDiscovery } from "@/components/organisms/MarketplaceDiscovery";
import { PerformanceChart } from "@/components/organisms/PerformanceChart";
import { PortfolioOverview } from "@/components/organisms/PortfolioOverview";
import { PropertyInvestments } from "@/components/organisms/PropertyInvestments";
import { RecentActivity } from "@/components/organisms/RecentActivity";
import { RentalIncome } from "@/components/organisms/RentalIncome";
import { TopProperty } from "@/components/organisms/TopProperty";
import { makeFmt, totals, type Portfolio } from "@/lib/portfolio";

// Client boundary: owns the display-currency choice and formats every figure through it.
export function DashboardView({ data: p }: { data: Portfolio }) {
  const [display, setDisplay] = useState(p.assetCurrency);
  const fmt = makeFmt(p, display);
  const top = p.holdings.filter((h) => h.monthlyNetRent != null).reduce<(typeof p.holdings)[number] | null>((a, b) => (!a || b.monthlyNetRent! > a.monthlyNetRent! ? b : a), null);
  return (
    <>
      <PortfolioOverview p={p} fmt={fmt} display={display} onDisplay={setDisplay} />
      <MarketplaceDiscovery offerings={p.offerings} fmt={fmt} />
      {/* Mobile order: summary, marketplace, investments, then performance, income, activity. */}
      <div className="grid items-start gap-10 max-md:order-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PerformanceChart history={p.history} fmt={fmt} />
        <Section id="top" title="Top-performing property">
          {top ? <TopProperty property={top} fmt={fmt} /> : <Unavailable what="Top property" hint="no rent data yet." />}
        </Section>
      </div>
      <PropertyInvestments holdings={p.holdings} fmt={fmt} />
      <div className="max-md:order-2"><RentalIncome holdings={p.holdings} history={p.rentHistory} distributions={p.distributions} fmt={fmt} lifetime={totals(p).rent} /></div>
      <div className="max-md:order-3"><RecentActivity items={p.activity} fmt={fmt} /></div>
    </>
  );
}
