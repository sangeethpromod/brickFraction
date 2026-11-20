import type { ComponentType } from "react";
import { PageHeader } from "@/components/molecules/PageHeader";
import { InvestorDashboard } from "@/components/templates/InvestorDashboard";
import { isRole, type Role } from "@/lib/roles";

// Role dashboards live here so they render inside the shared AppShell. Add a role by adding an entry.
const DASHBOARDS: Partial<Record<Role, ComponentType>> = { investor: InvestorDashboard };

export default async function RoleDashboard({ params }: PageProps<"/[role]">) {
  const { role } = await params;
  const Dashboard = isRole(role) ? DASHBOARDS[role] : undefined;
  return Dashboard ? <Dashboard /> : <PageHeader title="Dashboard" description="Coming soon." />;
}
