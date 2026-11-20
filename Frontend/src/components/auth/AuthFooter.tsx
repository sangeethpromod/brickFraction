import Link from "next/link";

export function AuthFooter({ prompt, linkText, href }: { prompt: string; linkText: string; href: string }) {
  return (
    <p className="mt-8 text-sm text-grey">
      {prompt}{" "}
      <Link
        href={href}
        className="font-medium text-charcoal underline decoration-bronze underline-offset-[3px] transition-colors duration-200 hover:decoration-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
      >
        {linkText}
      </Link>
    </p>
  );
}
