import { notFound } from "next/navigation";
import { PropertyDetailPage } from "@/components/templates/PropertyDetailPage";

// Only /investor/marketplace/{propertyId} exists so far.
export default async function DetailRoute({ params }: PageProps<"/[role]/[page]/[id]">) {
  const { role, page, id } = await params;
  if (role !== "investor" || page !== "marketplace") notFound();
  return <PropertyDetailPage id={id} />;
}
