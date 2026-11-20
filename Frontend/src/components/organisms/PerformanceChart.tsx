"use client";
import { useState } from "react";
import { Section, Unavailable } from "@/components/molecules/Section";
import { TimeRangeSelector } from "@/components/molecules/TimeRangeSelector";
import { RANGE_DAYS, shortDate, type Fmt, type HistoryPoint, type RangeKey } from "@/lib/portfolio";

const DAY = 864e5;

// Dependency-free SVG chart: lines are stretched SVG, axes/tooltip are HTML so text never distorts.
export function PerformanceChart({ history, fmt, title = "Portfolio performance" }: { history: HistoryPoint[]; fmt: Fmt; title?: string }) {
  const [range, setRange] = useState<RangeKey>("1Y");
  const [hover, setHover] = useState<number | null>(null);

  const last = history.length ? Date.parse(history[history.length - 1].t) : 0;
  const pts = history.filter((h) => Date.parse(h.t) >= last - RANGE_DAYS[range] * DAY);
  const selector = <TimeRangeSelector value={range} onChange={(r) => { setRange(r); setHover(null); }} />;

  if (pts.length < 2)
    return (
      <Section id="perf" title={title} aside={selector}>
        <Unavailable what="Valuation history" hint="fewer than two published valuations in this period." />
      </Section>
    );

  const hasRent = pts.some((h) => h.rentCum != null);
  const total = (h: HistoryPoint) => (h.rentCum == null ? null : h.value + h.rentCum); // value incl. rent received
  const all = pts.flatMap((h) => [h.value, ...(h.invested == null ? [] : [h.invested]), ...(total(h) == null ? [] : [total(h)!])]);
  const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo || hi * 0.1 || 1) * 0.08;
  const min = lo - pad, span = hi + pad - min;
  const x = (i: number) => (i / (pts.length - 1)) * 100;
  const y = (v: number) => 100 - ((v - min) / span) * 100;
  const path = (get: (h: HistoryPoint) => number | null) =>
    pts.flatMap((h, i) => { const v = get(h); return v == null ? [] : [`${x(i)},${y(v)}`]; }).join(" ");
  const yTicks = [hi + pad, min + span / 2, min];
  const h = hover == null ? null : pts[hover];

  return (
    <Section id="perf" title={title} aside={selector}>
      <div className="rounded-sm border border-line bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-grey">
          <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-charcoal" />Portfolio value</span>
          <span className="flex items-center gap-2"><span className="h-0 w-5 border-t-2 border-dashed border-bronze" />Invested capital</span>
          {hasRent && <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-gain" />Value + rent received</span>}
        </div>
        <div className="flex gap-3">
          <div className="flex h-56 w-20 shrink-0 flex-col justify-between text-right text-[11px] text-grey tabular-nums sm:w-24" aria-hidden="true">
            {yTicks.map((v, i) => <span key={i}>{fmt(v)}</span>)}
          </div>
          <div
            className="relative h-56 min-w-0 flex-1 touch-pan-y"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(Math.max(0, Math.min(pts.length - 1, Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1)))));
            }}
            onPointerLeave={() => setHover(null)}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full" role="img" aria-label={`Portfolio value from ${shortDate(pts[0].t)} to ${shortDate(pts[pts.length - 1].t)}`}>
              {[0, 50, 100].map((g) => <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="#eae8e2" vectorEffect="non-scaling-stroke" />)}
              <polyline points={path((p) => p.invested)} fill="none" stroke="#b58a60" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              {hasRent && <polyline points={path(total)} fill="none" stroke="#647b68" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
              <polyline points={path((p) => p.value)} fill="none" stroke="#191a19" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {h && hover != null && (
              <>
                <div className="pointer-events-none absolute inset-y-0 w-px bg-charcoal/30" style={{ left: `${x(hover)}%` }} />
                <div className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-charcoal" style={{ left: `${x(hover)}%`, top: `${y(h.value)}%` }} />
                <div
                  className="pointer-events-none absolute top-0 z-10 w-48 rounded-sm border border-line bg-surface p-3 text-xs shadow-sm"
                  style={{ left: `${x(hover)}%`, transform: `translateX(${hover > pts.length / 2 ? "calc(-100% - 12px)" : "12px"})` }}
                >
                  <p className="font-medium">{shortDate(h.t)}</p>
                  <p className="mt-1 flex justify-between tabular-nums"><span className="text-grey">Value</span>{fmt(h.value)}</p>
                  {h.invested != null && (
                    <>
                      <p className="flex justify-between tabular-nums"><span className="text-grey">Invested</span>{fmt(h.invested)}</p>
                      <p className={`flex justify-between tabular-nums ${h.value >= h.invested ? "text-gain" : "text-loss"}`}><span className="text-grey">Price change</span>{h.value >= h.invested ? "+" : "−"}{fmt(Math.abs(h.value - h.invested))}</p>
                      {h.rentCum != null && <p className="flex justify-between tabular-nums"><span className="text-grey">Rent received</span>{fmt(h.rentCum)}</p>}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 flex justify-between pl-[92px] text-[11px] text-grey sm:pl-[108px]" aria-hidden="true">
          <span>{shortDate(pts[0].t)}</span>
          <span>{shortDate(pts[Math.floor(pts.length / 2)].t)}</span>
          <span>{shortDate(pts[pts.length - 1].t)}</span>
        </div>
        <p className="mt-3 text-xs text-grey">Published valuation points only; nothing is interpolated. Values reflect asset NAV, excluding FX.</p>
      </div>
    </Section>
  );
}
