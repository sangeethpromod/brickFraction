import type { ReactNode } from "react";

// Quiet metric: label, value, optional note. `size="sm"` for secondary metrics.
export function MetricCard({ label, value, note, size = "md" }: { label: string; value: ReactNode; note?: ReactNode; size?: "sm" | "md" }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-grey">{label}</dt>
      <dd className={`mt-1 font-medium tabular-nums ${size === "md" ? "text-2xl" : "text-base"}`}>{value}</dd>
      {note && <p className="mt-1 text-xs text-grey">{note}</p>}
    </div>
  );
}
