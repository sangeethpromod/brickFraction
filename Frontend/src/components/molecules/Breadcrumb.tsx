"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLES, hrefFor, type Role } from "@/lib/roles";

export function Breadcrumb({ role }: { role: Role }) {
  const { label, nav } = ROLES[role];
  const slugs = usePathname().split("/").filter(Boolean).slice(1); // drop the role segment
  const crumbs = [
    { label, href: hrefFor(role, "") },
    ...slugs.map((s, i) => {
      const slug = slugs.slice(0, i + 1).join("/");
      const name = nav.find((n) => n.slug === slug)?.label ?? s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
      return { label: name, href: hrefFor(role, slug) };
    }),
  ];
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm text-grey">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-charcoal">{c.label}</span>
            ) : (
              <Link href={c.href} className="transition-colors duration-200 hover:text-charcoal">{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
