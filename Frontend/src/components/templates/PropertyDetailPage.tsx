import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Unavailable } from "@/components/molecules/Section";
import { PropertyAlerts, PropertyHeader } from "@/components/property/PropertyHeader";
import { PropertyDebt, PropertyReserves } from "@/components/property/PropertyFinancing";
import { PropertyAudit, PropertyLegal } from "@/components/property/PropertyLegal";
import { PropertyMedia } from "@/components/property/PropertyMedia";
import { PropertyOwnership } from "@/components/property/PropertyOwnership";
import { PropertyRent } from "@/components/property/PropertyRent";
import { PropertyValuation } from "@/components/property/PropertyValuation";
import { getProperty } from "@/lib/property";

export async function PropertyDetailPage({ id }: { id: string }) {
  const res = await getProperty(id);
  if (res.status === "notfound") notFound();
  if (res.status === "unavailable") return <div className="mx-auto max-w-6xl"><PageHeader title="Property" /><Unavailable what="Property details" hint="the property API isn't available yet." /></div>;
  const p = res.data;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 motion-safe:animate-rise">
      <div className="flex flex-col gap-4"><PropertyHeader p={p} /><PropertyAlerts p={p} /></div>
      <PropertyMedia p={p} />
      <PropertyValuation p={p} />
      <PropertyRent p={p} />
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start"><PropertyReserves p={p} /><PropertyDebt p={p} /></div>
      <PropertyOwnership p={p} />
      <PropertyLegal p={p} />
      <PropertyAudit p={p} />
    </div>
  );
}
