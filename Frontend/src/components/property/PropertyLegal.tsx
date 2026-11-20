import { Section } from "@/components/molecules/Section";
import type { PropertyDetail } from "@/lib/property";

const Addr = ({ label, addr, base }: { label: string; addr: string | null; base: string | null }) => (
  <div><dt className="text-xs text-grey">{label}</dt><dd className="font-mono text-sm break-all">{addr && base ? <a href={`${base}/address/${addr}`} className="text-bronze underline underline-offset-4">{addr}</a> : (addr ?? "—")}</dd></div>
);

export function PropertyLegal({ p }: { p: PropertyDetail }) {
  return (
    <Section id="legal" title="Risks & legal">
      <div className="grid gap-4 rounded-sm border border-line bg-surface p-5 lg:grid-cols-2">
        <div className="text-sm">
          <p className="text-xs text-grey">Structure</p><p>{p.spv}</p>
          <p className="mt-4 text-xs text-grey">Risk factors</p>
          <ul className="mt-1 list-disc pl-5 text-grey">{p.risks.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
        <div className="flex flex-col gap-4">
          <p className="rounded-sm bg-canvas p-3 text-sm">Technical simulation on a local testnet with tUSD. No real property ownership, no real money.</p>
          <dl className="flex flex-col gap-3"><Addr label="Share token" addr={p.tokenAddress} base={p.explorerBase} /><Addr label="Rent distributor" addr={p.distributorAddress} base={p.explorerBase} /></dl>
        </div>
      </div>
    </Section>
  );
}

export function PropertyAudit({ p }: { p: PropertyDetail }) {
  return (
    <Section id="audit" title="Activity & audit log">
      {p.audit.length === 0 ? <p className="text-sm text-grey">No public events yet.</p> : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-surface text-sm">
          {p.audit.map((a) => (
            <li key={a.at + a.text} className="flex flex-wrap justify-between gap-2 px-4 py-3">
              <span>{a.text}</span>
              <span className="text-xs text-grey"><span className="mr-2 capitalize">{a.kind}</span><time dateTime={a.at}>{new Date(a.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time></span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
