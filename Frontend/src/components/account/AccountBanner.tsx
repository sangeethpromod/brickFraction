import { AlertTriangle, Clock } from "lucide-react";
import type { Allowlist } from "@/lib/account";

// Why the page is read-only. `blocked` is true for pending and frozen wallets.
export const isBlocked = (s: Allowlist) => s !== "approved";
export const blockReason = (s: Allowlist) => (s === "pending" ? "Waiting for approval." : s === "frozen" ? "Wallet is frozen." : null);

export function AccountBanner({ status }: { status: Allowlist }) {
  if (status === "approved") return null;
  const frozen = status === "frozen";
  const Icon = frozen ? AlertTriangle : Clock;
  return (
    <div role={frozen ? "alert" : "status"} className={`flex gap-3 rounded-sm border px-4 py-3 text-sm ${frozen ? "border-loss/30 bg-loss/5" : "border-bronze/40 bg-bronze/5"}`}>
      <Icon size={16} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${frozen ? "text-loss" : "text-bronze"}`} aria-hidden="true" />
      {frozen ? (
        <p><strong>Wallet frozen.</strong> Your units are restricted: you can&apos;t sell, transfer or claim rent. You can still view your holdings and history. Contact support to resolve this.</p>
      ) : (
        <p><strong>Waiting for approval.</strong> Your account is being verified for the investor allowlist. This page is read-only; buying and claiming are disabled until you&apos;re approved.</p>
      )}
    </div>
  );
}
