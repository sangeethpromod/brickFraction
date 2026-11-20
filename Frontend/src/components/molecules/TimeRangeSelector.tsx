"use client";
import { RANGE_DAYS, type RangeKey } from "@/lib/portfolio";

// Segmented control. Pass `options` to reuse it for any short list (e.g. currencies).
export function TimeRangeSelector<T extends string = RangeKey>({
  value, onChange, options = Object.keys(RANGE_DAYS) as T[], label = "Time range",
}: { value: T; onChange: (v: T) => void; options?: T[]; label?: string }) {
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {options.map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={`h-8 cursor-pointer rounded-sm px-3 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-bronze ${value === k ? "bg-charcoal text-ivory" : "text-grey hover:text-charcoal"}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
