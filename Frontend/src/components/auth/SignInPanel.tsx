"use client";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getMe } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { homeFor } from "@/lib/roles";

// Signs in with Better Auth, asks the Go API for the user's roles, then redirects.
export function SignInPanel() {
  const router = useRouter();
  return (
    <AuthForm
      forgotPasswordHref="/forgot-password"
      onSubmit={async ({ email, password }) => {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message ?? "Sign-in failed.");
        // If the API is down, fall back to the investor area rather than blocking sign-in.
        let target = homeFor([]);
        try {
          target = homeFor((await getMe()).roles);
        } catch {
          /* keep the fallback */
        }
        router.push(target);
      }}
    />
  );
}
