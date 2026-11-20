"use client";
import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/organisms/Sidebar";
import { Topbar } from "@/components/organisms/Topbar";
import type { Role } from "@/lib/roles";

// Shared layout for every role: sidebar + topbar (both driven by lib/roles.ts) + page content.
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-dvh gap-2 bg-canvas p-2 max-md:p-0">
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Topbar role={role} onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 pt-4 md:p-8 md:pt-6">{children}</main>
      </div>
    </div>
  );
}
