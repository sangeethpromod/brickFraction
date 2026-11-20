import { Bell, Menu, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/molecules/Breadcrumb";
import { ROLES, hrefFor, type Role } from "@/lib/roles";

const ICONS: Partial<Record<string, LucideIcon>> = { wallet: Wallet, notifications: Bell };

// Header is its own bordered surface, matching the sidebar's radius and the shell's 8px gap.
export function Topbar({ role, onMenu }: { role: Role; onMenu: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 rounded-sm border border-line bg-surface px-4 max-md:rounded-none max-md:border-x-0 max-md:border-t-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="-ml-2 flex size-10 cursor-pointer items-center justify-center rounded-sm md:hidden focus-visible:outline-2 focus-visible:outline-bronze"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
        <Breadcrumb role={role} />
      </div>
      <div className="flex items-center gap-1">
        {ROLES[role].actions.map((a) => {
          const Icon = ICONS[a.slug];
          return (
            <Link
              key={a.slug}
              href={hrefFor(role, a.slug)}
              aria-label={Icon ? a.label : undefined}
              className="flex h-10 items-center gap-2 rounded-sm px-3 text-sm font-medium text-grey transition-colors duration-200 hover:text-charcoal focus-visible:outline-2 focus-visible:outline-bronze"
            >
              {Icon ? <Icon size={18} strokeWidth={1.5} /> : null}
              <span className={Icon ? "max-sm:sr-only" : ""}>{a.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
