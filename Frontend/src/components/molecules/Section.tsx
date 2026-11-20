import type { ReactNode } from "react";

export function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <h2 id={id} className="text-[13px] font-medium tracking-[0.08em] text-grey uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// Honest empty state: shown when the backend can't supply the data yet.
export function Unavailable({ what, hint }: { what: string; hint?: string }) {
  return (
    <p className="rounded-sm border border-dashed border-line bg-surface px-4 py-6 text-sm text-grey">
      {what} unavailable{hint ? ` — ${hint}` : "."}
    </p>
  );
}

export const linkCls = "text-sm font-medium text-charcoal underline decoration-bronze underline-offset-4 hover:text-bronze focus-visible:outline-2 focus-visible:outline-bronze";
