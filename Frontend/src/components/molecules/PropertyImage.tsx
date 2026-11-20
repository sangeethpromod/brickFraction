import { Building2 } from "lucide-react";

// Photo when the backend supplies one; otherwise a neutral tile (never a repeated stock image).
export function PropertyImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  return src ? (
    <div className={`bg-cover bg-center ${className}`} style={{ backgroundImage: `url(${src})` }} role="img" aria-label={alt} />
  ) : (
    <div className={`flex items-center justify-center bg-charcoal/90 text-ivory/40 ${className}`} role="img" aria-label={`${alt} (no photo yet)`}>
      <Building2 size={28} strokeWidth={1.25} />
    </div>
  );
}
