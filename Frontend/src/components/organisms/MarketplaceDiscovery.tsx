"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { OfferingCard } from "@/components/molecules/OfferingCard";
import { Section, Unavailable, linkCls } from "@/components/molecules/Section";
import { TimeRangeSelector } from "@/components/molecules/TimeRangeSelector";
import { type Fmt, type Offering } from "@/lib/portfolio";

const TABS = { primary: "New offerings", resale: "Available for resale" } as const;

export function MarketplaceDiscovery({ offerings, fmt }: { offerings: Offering[]; fmt: Fmt }) {
  const kinds = (Object.keys(TABS) as Offering["kind"][]).filter((k) => offerings.some((o) => o.kind === k));
  const [kind, setKind] = useState<Offering["kind"]>(kinds[0] ?? "primary");
  const shown = offerings.filter((o) => o.kind === kind).slice(0, 3);
  const labels: string[] = kinds.map((k) => TABS[k]);
  return (
    <Section
      id="mkt"
      title="Discover your next investment"
      aside={<Link href="/investor/marketplace" className={`${linkCls} inline-flex items-center gap-1`}>Explore marketplace <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></Link>}
    >
      {offerings.length === 0 ? (
        <Unavailable what="Open offerings" hint="none listed right now." />
      ) : (
        <>
          {labels.length > 1 && (
            <TimeRangeSelector<string> value={TABS[kind]} onChange={(l) => setKind(kinds[labels.indexOf(l)])} options={labels} label="Listing type" />
          )}
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((o) => <OfferingCard key={`${o.kind}-${o.id}`} o={o} fmt={fmt} />)}
          </ul>
          <p className="text-xs text-grey">Yields are indicative and not guaranteed. Prices, fees and availability are confirmed in the trading flow before you commit; resale does not guarantee a buyer or instant liquidity.</p>
        </>
      )}
    </Section>
  );
}
