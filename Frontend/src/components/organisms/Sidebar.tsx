"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLES, hrefFor, type Role } from "@/lib/roles";

type Props = { role: Role; open: boolean; onClose: () => void };

// Floating card (echoes the login panel): sunset photo under a dark veil, numbered index, bronze marker for the active page.
export function Sidebar({ role, open, onClose }: Props) {
  const pathname = usePathname();
  const { label, nav } = ROLES[role];
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-charcoal/40 md:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={[
          "fixed inset-y-2 left-2 z-40 flex w-64 flex-col overflow-hidden rounded-sm p-6 text-ivory transition-transform duration-200",
          "bg-[linear-gradient(to_bottom,rgba(23,25,24,0.72),rgba(23,25,24,0.94)),url('/bg.png')] bg-cover bg-[position:70%_center]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-[110%]",
        ].join(" ")}
      >
        <div>
          <span className="text-[21px] font-bold tracking-[-0.01em]">BrickFraction</span>
          <p className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.12em] text-ivory/60 uppercase">
            <span className="h-px w-5 bg-bronze" aria-hidden="true" />{label}
          </p>
        </div>

        <nav aria-label="Primary" className="mt-12 flex flex-1 flex-col">
          {nav.map((item, i) => {
            const href = hrefFor(role, item.slug);
            const active = item.slug ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex items-baseline gap-4 border-b border-ivory/10 py-3.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-bronze",
                  active ? "text-ivory" : "text-ivory/50 hover:text-ivory",
                ].join(" ")}
              >
                <span className={`text-[11px] tabular-nums transition-colors duration-200 ${active ? "text-bronze" : "text-ivory/30"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`text-[17px] transition-transform duration-200 group-hover:translate-x-1 ${active ? "translate-x-1 font-medium" : ""}`}>
                  {item.label}
                </span>
                {active && <span className="absolute right-0 size-1.5 self-center rounded-full bg-bronze" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        {/* MOCK user: replace with the session user */}
        <div className="mt-6 flex items-center gap-3 rounded-sm border border-white/15 bg-white/5 p-3 backdrop-blur-md">
          <span className="flex size-9 items-center justify-center rounded-full bg-bronze/90 text-sm font-semibold text-charcoal">AM</span>
          <div className="leading-tight">
            <p className="text-sm font-medium">Alex Morgan</p>
            <p className="text-xs text-ivory/50">Verified</p>
          </div>
        </div>
      </aside>
    </>
  );
}
