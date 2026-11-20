import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/templates/AppShell";
import { auth } from "@/lib/auth";
import { isRole } from "@/lib/roles";

export default async function RoleLayout({ children, params }: LayoutProps<"/[role]">) {
  const { role } = await params;
  if (!isRole(role)) notFound();
  // Signed-out visitors go to sign-in. Role enforcement itself happens in the Go API.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  return <AppShell role={role}>{children}</AppShell>;
}
