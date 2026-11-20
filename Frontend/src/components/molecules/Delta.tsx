import { pct as fmtPct } from "@/lib/portfolio";

// Signed change: muted green ▲ for gains, muted red ▼ for losses. `text` is the pre-formatted amount.
export function Delta({ text, pct }: { text: string; pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-baseline gap-2 text-sm font-medium tabular-nums ${up ? "text-gain" : "text-loss"}`}>
      <span aria-hidden="true" className="text-[10px]">{up ? "▲" : "▼"}</span>
      <span>{up ? "+" : "−"}{text}</span>
      <span className="opacity-80">{fmtPct(pct)}</span>
    </span>
  );
}
