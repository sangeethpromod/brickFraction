import { Unavailable } from "@/components/molecules/Section";
import { DashboardView } from "@/components/templates/DashboardView";
import { getPortfolio } from "@/lib/portfolio";

export async function InvestorDashboard() {
  const res = await getPortfolio();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 motion-safe:animate-rise">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl">{res.status === "ok" ? `Good day, ${res.data.investor.name}` : "Your portfolio"}</h1>
        <span className="rounded-sm border border-line bg-surface px-2.5 py-1 text-[11px] tracking-[0.08em] text-grey uppercase">Local testnet · tUSD · not real investment</span>
      </header>
      {res.status === "ok" ? <DashboardView data={res.data} /> : <Unavailable what="Portfolio data" hint="the portfolio API isn't available yet." />}
    </div>
  );
}
