import { AuthFooter } from "@/components/auth/AuthFooter";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignInPanel } from "@/components/auth/SignInPanel";

export default function Home() {
  return (
    <AuthLayout>
      <AuthHeader title="Welcome back" description="Sign in to manage your fractional property portfolio." />
      <SignInPanel />
      <AuthFooter prompt="New to BrickFraction?" linkText="Create an account" href="/signup" />
    </AuthLayout>
  );
}
