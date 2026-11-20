import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  trailing?: ReactNode; // e.g. a show/hide button
};

export function InputField({ label, error, trailing, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[13px] font-medium tracking-[0.01em]">{label}</label>
      <div className="relative">
        <input
          id={inputId}
          className={[
            "h-12 w-full rounded-sm border border-charcoal/20 bg-white/50 px-4 text-base text-charcoal backdrop-blur-sm",
            "placeholder:text-grey/80 transition duration-200 hover:enabled:border-charcoal/45",
            "focus:border-charcoal focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-bronze",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-error aria-invalid:focus:ring-error/45",
            trailing && "pr-[72px]",
          ].filter(Boolean).join(" ")}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>}
      </div>
      {error && <span id={errorId} role="alert" className="text-[13px] text-error">{error}</span>}
    </div>
  );
}
