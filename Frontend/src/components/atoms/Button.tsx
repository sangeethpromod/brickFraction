import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  loading?: boolean;
};

const variants = {
  primary: "bg-charcoal text-ivory hover:enabled:bg-[#2c302e]",
  secondary: "border-charcoal/20 text-charcoal hover:enabled:border-charcoal",
};

export function Button({ variant = "primary", fullWidth, loading, disabled, className = "", children, ...rest }: Props) {
  const cls = [
    "inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-transparent px-6 text-[15px] font-semibold tracking-[0.01em] cursor-pointer",
    "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    fullWidth && "w-full",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}
