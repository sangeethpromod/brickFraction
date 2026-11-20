"use client";
import { useRouter } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { authClient } from "@/lib/auth-client";
import { homeFor } from "@/lib/roles";

// Sign-up also signs the user in (no email verification). New users are investors (lazy provisioning in Go).
export function SignUpPanel() {
  const router = useRouter();
  return (
    <SignUpForm
      onSubmit={async ({ name, email, password }) => {
        const { error } = await authClient.signUp.email({ name: name.trim(), email, password });
        if (error) throw new Error(error.message ?? "Sign-up failed.");
        router.push(homeFor([]));
      }}
    />
  );
}
