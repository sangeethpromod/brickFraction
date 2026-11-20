"use client";
import { FileText } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/molecules/Section";
import { TimeRangeSelector } from "@/components/molecules/TimeRangeSelector";
import type { PropertyDetail } from "@/lib/property";

export function PropertyMedia({ p }: { p: PropertyDetail }) {
  const tabs = ["Photos", ...(p.floorPlan ? ["Floor plan"] : []), ...(p.mapEmbed ? ["Map"] : [])];
  const [tab, setTab] = useState(tabs[0]);
  const [i, setI] = useState(0);
  return (
    <Section id="media" title="Media & documents" aside={<TimeRangeSelector<string> value={tab} onChange={setTab} options={tabs} label="Media type" />}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {tab === "Photos" && (
            <>
              <div className="aspect-[16/10] rounded-sm bg-charcoal bg-cover bg-center" style={{ backgroundImage: `url(${p.photos[i]})` }} role="img" aria-label={`${p.name} photo ${i + 1} of ${p.photos.length}`} />
              <div className="mt-2 grid grid-cols-5 gap-2">
                {p.photos.map((src, k) => (
                  <button key={src} type="button" onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`} aria-pressed={k === i} className={`aspect-[4/3] cursor-pointer rounded-sm bg-cover bg-center outline-offset-2 focus-visible:outline-2 focus-visible:outline-bronze ${k === i ? "outline-2 outline-bronze" : "opacity-70 hover:opacity-100"}`} style={{ backgroundImage: `url(${src})` }} />
                ))}
              </div>
            </>
          )}
          {tab === "Floor plan" && p.floorPlan && <div className="aspect-[16/10] rounded-sm border border-line bg-surface bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${p.floorPlan})` }} role="img" aria-label={`${p.name} floor plan`} />}
          {tab === "Map" && p.mapEmbed && <iframe title={`Map of ${p.address}`} src={p.mapEmbed} loading="lazy" className="aspect-[16/10] w-full rounded-sm border border-line" />}
        </div>
        <div className="rounded-sm border border-line bg-surface p-5">
          <h3 className="text-xs text-grey">Documents</h3>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {p.documents.map((d) => (
              <li key={d.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><FileText size={16} strokeWidth={1.5} className="text-grey" aria-hidden="true" />{d.label}</span>
                {d.href ? <a href={d.href} className="text-bronze underline underline-offset-4">Open</a> : <span className="text-xs text-grey">Not uploaded</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
