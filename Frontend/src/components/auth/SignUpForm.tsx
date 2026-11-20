"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { InputField } from "@/components/atoms/InputField";
import { PasswordInput } from "@/components/atoms/PasswordInput";

type Values = { name: string; email: string; password: string };
type Props = { onSubmit: (values: Values) => Promise<void> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validate = (v: Values) => ({
  name: v.name.trim() ? "" : "Enter your name.",
  email: !v.email ? "Enter your email address." : !EMAIL_RE.test(v.email) ? "Enter a valid email address." : "",
  password: v.password.length >= 8 ? "" : "Use at least 8 characters.",
});

export function SignUpForm({ onSubmit }: Props) {
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = validate(values);
  const valid = !errors.name && !errors.email && !errors.password;
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
    setTouched({ name: true, email: true, password: true });
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <InputField {...field("name")} label="Name" placeholder="Your name" autoComplete="name" required />
      <InputField {...field("email")} label="Email" type="email" placeholder="you@example.com" autoComplete="email" required />
      <PasswordInput {...field("password")} label="Password" placeholder="At least 8 characters" autoComplete="new-password" required />
      {error && <p role="alert" className="rounded-sm bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}
      <Button type="submit" fullWidth loading={submitting} disabled={!valid}>Create account</Button>
    </form>
  );
}
