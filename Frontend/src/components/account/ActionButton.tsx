// Every money action goes through here. Until the wallet API exists CONNECTED is false, so nothing pretends to execute.
const CONNECTED = false;

export function ActionButton({ label, reason, primary = false, small = false }: { label: string; reason?: string | null; primary?: boolean; small?: boolean }) {
  const why = reason ?? (CONNECTED ? null : "Not connected yet: the wallet API isn't available.");
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={!!why}
        title={why ?? undefined}
        className={`${small ? "h-8 px-3" : "h-10 px-4"} rounded-sm text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-bronze disabled:cursor-not-allowed disabled:opacity-40 ${primary ? "bg-charcoal text-ivory" : "border border-line bg-surface hover:border-bronze"}`}
      >
        {label}
      </button>
    </span>
  );
}
