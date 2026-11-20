// Single source of truth for role-based navigation. Adding a page/role = editing this file.
export type Role = "investor" | "issuer-admin" | "property-manager" | "platform-admin" | "tenant";

type NavItem = { label: string; slug: string }; // slug "" = the role's dashboard
type TopbarAction = { label: string; slug: string };
type RoleConfig = { label: string; nav: NavItem[]; actions: TopbarAction[] };

const dashboard: NavItem = { label: "Dashboard", slug: "" };
const settings: NavItem = { label: "Settings", slug: "settings" };

export const ROLES: Record<Role, RoleConfig> = {
  investor: {
    label: "Investor",
    nav: [dashboard, { label: "Marketplace", slug: "marketplace" }, { label: "Portfolio", slug: "portfolio" },
      { label: "Transactions", slug: "transactions" }, { label: "Wallet", slug: "wallet" }, { label: "Documents", slug: "documents" }, settings],
    actions: [{ label: "Wallet", slug: "wallet" }, { label: "Notifications", slug: "notifications" }],
  },
  "issuer-admin": {
    label: "Issuer Admin",
    nav: [dashboard, { label: "Properties", slug: "properties" }, { label: "Offerings", slug: "offerings" },
      { label: "Investors", slug: "investors" }, { label: "Distributions", slug: "distributions" }, settings],
    actions: [{ label: "New offering", slug: "offerings/new" }],
  },
  "property-manager": {
    label: "Property Manager",
    nav: [dashboard, { label: "Properties", slug: "properties" }, { label: "Maintenance", slug: "maintenance" },
      { label: "Tenants", slug: "tenants" }, { label: "Rent", slug: "rent" }, settings],
    actions: [{ label: "New request", slug: "maintenance/new" }],
  },
  "platform-admin": {
    label: "Platform Admin",
    nav: [dashboard, { label: "Compliance", slug: "compliance" }, { label: "KYC review", slug: "kyc" },
      { label: "Users", slug: "users" }, { label: "Audit log", slug: "audit-log" }, settings],
    actions: [{ label: "Review queue", slug: "kyc" }],
  },
  tenant: {
    label: "Tenant",
    nav: [dashboard, { label: "Rent", slug: "rent" }, { label: "Maintenance", slug: "maintenance" }, { label: "Documents", slug: "documents" }, settings],
    actions: [{ label: "Report an issue", slug: "maintenance/new" }],
  },
};

export const isRole = (v: string): v is Role => v in ROLES;
export const hrefFor = (role: Role, slug: string) => (slug ? `/${role}/${slug}` : `/${role}`);

// Backend role names (Go `roles` table) -> UI role slugs used in /[role] routes.
const UI_ROLE_BY_API_ROLE: Record<string, Role> = {
  platform_admin: "platform-admin",
  issuer: "issuer-admin",
  property_manager: "property-manager",
  tenant: "tenant",
  investor: "investor",
};

// If a user holds several roles, the first one found here decides where they land.
const PRIORITY = ["platform_admin", "issuer", "property_manager", "tenant", "investor"];

// Convenience redirect only, not security: the API enforces roles with RequireRole.
export function homeFor(apiRoles: string[]): string {
  const apiRole = PRIORITY.find((r) => apiRoles.includes(r));
  return hrefFor(apiRole ? UI_ROLE_BY_API_ROLE[apiRole] : "investor", "");
}
