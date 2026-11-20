"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import { OfferingCard } from "@/components/molecules/OfferingCard";
import { Unavailable } from "@/components/molecules/Section";
import { TimeRangeSelector } from "@/components/molecules/TimeRangeSelector";
import { money, type Offering } from "@/lib/portfolio";

const TABS = ["All", "New offerings", "Available for resale"] as const;
type Tab = (typeof TABS)[number];

export function Marketplace({ offerings, currency }: { offerings: Offering[]; currency: string }) {
  const [tab, setTab] = useState<Tab>("All");
  const [q, setQ] = useState("");
  const shown = offerings.filter((o) =>
    (tab === "All" || (tab === "New offerings") === (o.kind === "primary")) && `${o.name} ${o.city}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 motion-safe:animate-rise">
      <header>
        <h1 className="font-serif text-4xl leading-[1.1] tracking-[-0.01em]">Marketplace</h1>
        <p className="mt-2 max-w-[60ch] text-[15px] text-grey">New offerings and units listed for resale. Simulated on a local testnet with tUSD; yields are indicative and not guaranteed.</p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TimeRangeSelector<Tab> value={tab} onChange={setTab} options={[...TABS]} label="Listing type" />
        <label className="flex h-9 items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm">
          <Search size={16} strokeWidth={1.5} className="text-grey" aria-hidden="true" />
          <span className="sr-only">Search by name or city</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or city" className="w-48 bg-transparent outline-none placeholder:text-grey" />
        </label>
      </div>
      {shown.length === 0 ? <Unavailable what="Matching listings" hint="try another filter." /> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((o) => <OfferingCard key={`${o.kind}-${o.id}`} o={o} fmt={(n, d = 0) => money(n, currency, d)} />)}</ul>
      )}
    </div>
  );
}
