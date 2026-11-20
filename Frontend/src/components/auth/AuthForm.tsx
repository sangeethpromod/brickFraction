"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { InputField } from "@/components/atoms/InputField";
import { PasswordInput } from "@/components/atoms/PasswordInput";

type Values = { email: string; password: string };
type Props = {
  /** Resolve on success, throw/reject with a user-facing message on failure. */
  onSubmit?: (values: Values) => Promise<void>;
  forgotPasswordHref: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validate = (v: Values) => ({
  email: !v.email ? "Enter your email address." : !EMAIL_RE.test(v.email) ? "Enter a valid email address." : "",
  password: v.password ? "" : "Enter your password.",
});

export function AuthForm({ onSubmit, forgotPasswordHref }: Props) {
  const [values, setValues] = useState<Values>({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const errors = validate(values);
  const valid = !errors.email && !errors.password;
  const field = (name: keyof Values) => ({
    name,
    value: values[name],
    error: touched[name] ? errors[name] : undefined,
    disabled: submitting,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setTouched({ email: true, password: true });
    if (!valid) return;
    if (!onSubmit) return setStatus({ kind: "error", text: "Sign-in isn't connected yet." });
    setSubmitting(true);
    setStatus(null);
    try {
      await onSubmit(values);
      setStatus({ kind: "success", text: "Signed in." });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <InputField {...field("email")} label="Email" type="email" placeholder="you@example.com" autoComplete="email" required />
      <PasswordInput {...field("password")} label="Password" placeholder="Enter your password" autoComplete="current-password" required />
      <div className="-mt-2 flex justify-end">
        <Link href={forgotPasswordHref} className="text-[13px] text-grey transition-colors duration-200 hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze">Forgot password?</Link>
      </div>
      {status && (
        <p role={status.kind === "error" ? "alert" : "status"} className={`rounded-sm px-4 py-3 text-sm ${status.kind === "error" ? "bg-error/10 text-error" : "bg-green-700/10 text-green-800"}`}>
          {status.text}
        </p>
      )}
      <Button type="submit" fullWidth loading={submitting} disabled={!valid}>Sign in</Button>
    </form>
  );
}
