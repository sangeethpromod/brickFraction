import { AuthFooter } from "@/components/auth/AuthFooter";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpPanel } from "@/components/auth/SignUpPanel";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <AuthHeader title="Create your account" description="Start investing in fractional property." />
      <SignUpPanel />
      <AuthFooter prompt="Already have an account?" linkText="Sign in" href="/" />
    </AuthLayout>
  );
}
