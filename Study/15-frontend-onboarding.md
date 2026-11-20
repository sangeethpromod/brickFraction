# 15. Frontend: onboarding, KYC, issuer application, admin review

Now the browser side. A signed-in user with **no role** is "still onboarding" and lands on a new `/onboarding` page. A user **with** a role goes straight to their dashboard. The admin gets a review page inside the existing platform-admin area.

Time: about 45 minutes. Follow the existing frontend layering: `lib/` for API and rules, small components under `components/`, thin files under `app/`.

```text
Frontend/src/
  lib/roles.ts                              EDIT  (homeFor, admin nav)
  lib/api.ts                                EDIT  (new calls)
  app/onboarding/page.tsx                   NEW
  components/onboarding/OnboardingPanel.tsx NEW   decides what to show
  components/onboarding/KycForm.tsx         NEW   investor: Aadhaar + email, then OTP
  components/onboarding/IssuerApplyForm.tsx NEW   issuer: company details
  components/templates/IssuerApplicationsPage.tsx NEW  admin queue
  app/[role]/[page]/page.tsx                EDIT  (register the admin page)
```

> This repo's `Frontend/AGENTS.md` warns that its Next.js has breaking changes. Everything below uses only patterns already present in your files (client components, `useRouter`, `LayoutProps`), so it should not hit them. If something fails to compile, read the matching guide in `node_modules/next/dist/docs/`.

## 1. Edit `lib/roles.ts`

Two small changes.

**a)** In the `"platform-admin"` entry, add a nav item after `KYC review`, and point the topbar action at it:

```ts
    nav: [dashboard, { label: "Compliance", slug: "compliance" }, { label: "KYC review", slug: "kyc" },
      { label: "Issuer applications", slug: "issuer-applications" },
      { label: "Users", slug: "users" }, { label: "Audit log", slug: "audit-log" }, settings],
    actions: [{ label: "Review queue", slug: "issuer-applications" }],
```

**b)** Replace the `homeFor` function at the bottom. A user with no role used to be sent to the investor area; now they go to onboarding:

```ts
// Convenience redirect only, not security: the API enforces roles with RequireRole.
// No role yet means the user is still onboarding (KYC or an issuer application).
export function homeFor(apiRoles: string[]): string {
  const apiRole = PRIORITY.find((r) => apiRoles.includes(r));
  return apiRole ? hrefFor(UI_ROLE_BY_API_ROLE[apiRole], "") : "/onboarding";
}
```

Because `SignUpPanel` and `SignInPanel` already call `homeFor(...)`, **sign-up and login need no edits**: a new user lands on `/onboarding`, a returning investor or issuer lands on their dashboard. In `SignInPanel.tsx` you may update the stale comment to `// If the API is down, fall back to onboarding, which will show the error.`

## 2. Edit `lib/api.ts`

Append these to the bottom (after `getMe`). They mirror the Go endpoints one to one.

```ts
// File: Frontend/src/lib/api.ts (append)

// ---- KYC (investor) ----
export const startKyc = (aadhaar: string, email: string) =>
  api<{ status: string }>("/api/v1/kyc/start", { method: "POST", body: JSON.stringify({ aadhaar, email }) });

export const verifyKyc = (otp: string) =>
  api<{ status: string }>("/api/v1/kyc/verify", { method: "POST", body: JSON.stringify({ otp }) });

// ---- Issuer applications ----
export type ApplicationStatus = "pending" | "approved" | "rejected";

export type IssuerApplication = {
  id: string;
  user_id: string;
  company_name: string;
  registration_number: string;
  contact_phone: string;
  description: string;
  status: ApplicationStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ApplyInput = Pick<IssuerApplication, "company_name" | "registration_number" | "contact_phone" | "description">;

export const applyAsIssuer = (input: ApplyInput) =>
  api<IssuerApplication>("/api/v1/issuer/applications", { method: "POST", body: JSON.stringify(input) });

export const getMyApplication = () => api<{ application: IssuerApplication | null }>("/api/v1/issuer/applications/me");

// ---- Platform admin ----
export const listApplications = (status: ApplicationStatus) =>
  api<IssuerApplication[]>(`/api/v1/admin/issuer-applications?status=${status}`);

export const decideApplication = (id: string, action: "approve" | "reject", reason = "") =>
  api<IssuerApplication>(`/api/v1/admin/issuer-applications/${id}/${action}`, {
    method: "POST",
    body: action === "reject" ? JSON.stringify({ reason }) : undefined,
  });
```

The `// File:` line is a hint for you; do not type it. These all go through the existing `api()` helper, so the token and `ApiError` handling come for free. `err.message` on an `ApiError` is the Go message, so the form can show it as is (for example "that code is not correct").

## 3. The onboarding page

`app/` files stay thin, like `signup/page.tsx`: layout plus one panel.

```tsx
// File: Frontend/src/app/onboarding/page.tsx
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";

export default function OnboardingPage() {
  return (
    <AuthLayout>
      <AuthHeader title="Finish setting up" description="Tell us how you will use the platform." />
      <OnboardingPanel />
    </AuthLayout>
  );
}
```

## 4. OnboardingPanel: what to show

One component owns the state machine. It asks the API who you are and picks a view:

```text
getMe() -> has a role?          -> redirect to the dashboard
        -> issuer application?  -> "review" (pending, or rejected with a reason)
        -> nothing yet          -> "choose" (investor or issuer)
choose -> "kyc" or "issuer" form -> on success, load() again
```

Re-running `load()` after a success is the trick: after the OTP, `getMe()` returns `investor` and the redirect happens by itself. No duplicate redirect logic.

```tsx
// File: Frontend/src/components/onboarding/OnboardingPanel.tsx
"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { IssuerApplyForm } from "@/components/onboarding/IssuerApplyForm";
import { KycForm } from "@/components/onboarding/KycForm";
import { ApiError, getMe, getMyApplication, type IssuerApplication } from "@/lib/api";
import { homeFor } from "@/lib/roles";

type View = "loading" | "choose" | "kyc" | "issuer" | "review" | "error";

export function OnboardingPanel() {
  const router = useRouter();
  const [view, setView] = useState<View>("loading");
  const [app, setApp] = useState<IssuerApplication | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const me = await getMe();
      if (me.roles.length > 0) {
        router.replace(homeFor(me.roles));
        return;
      }
      const { application } = await getMyApplication();
      setApp(application);
      setView(application && application.status !== "approved" ? "review" : "choose");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/"); // not signed in
        return;
      }
      setMessage(err instanceof Error ? err.message : "Could not load your status.");
      setView("error");
    }
  }, [router]);

  useEffect(() => {
    // Fetch on mount: state is set after the await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const back = () => setView("choose");

  if (view === "loading") return <p role="status" className="text-grey">Loading…</p>;
  if (view === "kyc") return <KycForm onVerified={load} onBack={back} />;
  if (view === "issuer") return <IssuerApplyForm onSubmitted={load} onBack={back} />;

  if (view === "error") {
    return (
      <div className="flex flex-col gap-5">
        <p role="alert" className="rounded-sm bg-error/10 px-4 py-3 text-sm text-error">{message}</p>
        <Button onClick={() => void load()}>Try again</Button>
      </div>
    );
  }

  if (view === "review" && app) {
    return app.status === "pending" ? (
      <div className="flex flex-col gap-5">
        <p role="status">
          Your application for <strong>{app.company_name}</strong> is waiting for approval by a platform admin.
          You can close this page and sign in again later.
        </p>
        <Button variant="secondary" onClick={() => void load()}>Check again</Button>
      </div>
    ) : (
      <div className="flex flex-col gap-5">
        <p role="alert" className="rounded-sm bg-error/10 px-4 py-3 text-sm text-error">
          Your application was rejected: {app.rejection_reason ?? "no reason given"}.
        </p>
        <Button onClick={() => setView("issuer")}>Apply again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button fullWidth onClick={() => setView("kyc")}>I want to invest (verify with Aadhaar)</Button>
      <Button fullWidth variant="secondary" onClick={() => setView("issuer")}>I want to list a property (apply as issuer)</Button>
    </div>
  );
}
```

`"use client"` is needed because the component uses hooks and the browser-side `authClient`. The token comes from `authClient.token()` inside `api()`, which only works in the browser.

## 5. KycForm: two steps, one component

Step 1 collects the Aadhaar number and its linked email and calls `startKyc`. Step 2 collects the OTP and calls `verifyKyc`. `run()` wraps both so busy and error handling is written once.

```tsx
// File: Frontend/src/components/onboarding/KycForm.tsx
"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { InputField } from "@/components/atoms/InputField";
import { startKyc, verifyKyc } from "@/lib/api";

type Props = { onVerified: () => void; onBack: () => void };

export function KycForm({ onVerified, onBack }: Props) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [aadhaar, setAadhaar] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Runs an API action with shared busy and error handling.
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await startKyc(aadhaar, email);
      setStep("otp");
    });
  };

  const confirm = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await verifyKyc(otp);
      onVerified();
    });
  };

  const errorBox = error && <p role="alert" className="rounded-sm bg-error/10 px-4 py-3 text-sm text-error">{error}</p>;

  if (step === "otp") {
    return (
      <form className="flex flex-col gap-5" onSubmit={confirm} noValidate>
        <p className="text-sm text-grey">We sent a 6-digit code to {email}. It expires in 10 minutes.</p>
        <InputField label="Code" name="otp" value={otp} inputMode="numeric" maxLength={6} autoComplete="one-time-code"
          placeholder="123456" disabled={busy} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
        {errorBox}
        <Button type="submit" fullWidth loading={busy} disabled={otp.length !== 6}>Verify</Button>
        <Button type="button" variant="secondary" fullWidth disabled={busy} onClick={() => { setStep("details"); setOtp(""); setError(null); }}>
          Use different details or resend
        </Button>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={sendCode} noValidate>
      <InputField label="Aadhaar number" name="aadhaar" value={aadhaar} inputMode="numeric" maxLength={14}
        placeholder="1234 5678 9012" disabled={busy} onChange={(e) => setAadhaar(e.target.value.replace(/[^\d ]/g, ""))} />
      <InputField label="Email linked to your Aadhaar" name="email" type="email" value={email}
        placeholder="you@example.com" autoComplete="email" disabled={busy} onChange={(e) => setEmail(e.target.value)} />
      {errorBox}
      <Button type="submit" fullWidth loading={busy} disabled={aadhaar.replace(/ /g, "").length !== 12 || !email.includes("@")}>
        Send code
      </Button>
      <Button type="button" variant="secondary" fullWidth disabled={busy} onClick={onBack}>Back</Button>
    </form>
  );
}
```

Client checks here only make the button feel right. The real validation is in Go (`ErrInvalidAadhaar`, `ErrInvalidEmail`), and its message is what `run()` shows if the client check was bypassed.

In development the code is **not emailed**: read it in the terminal running the Go API (`DEMO: OTP email not sent`).

## 6. IssuerApplyForm

```tsx
// File: Frontend/src/components/onboarding/IssuerApplyForm.tsx
"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/atoms/Button";
import { InputField } from "@/components/atoms/InputField";
import { applyAsIssuer, type ApplyInput } from "@/lib/api";

type Props = { onSubmitted: () => void; onBack: () => void };

export function IssuerApplyForm({ onSubmitted, onBack }: Props) {
  const [values, setValues] = useState<ApplyInput>({ company_name: "", registration_number: "", contact_phone: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (name: keyof ApplyInput) => ({
    name,
    value: values[name],
    disabled: busy,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await applyAsIssuer(values);
      onSubmitted(); // OnboardingPanel reloads and shows "waiting for approval"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <InputField {...field("company_name")} label="Company name" placeholder="Acme Realty Pvt Ltd" autoComplete="organization" required />
      <InputField {...field("registration_number")} label="Registration number (CIN)" placeholder="U12345MH2020PTC000001" required />
      <InputField {...field("contact_phone")} label="Contact phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" required />
      <InputField {...field("description")} label="About the company (optional)" placeholder="What do you develop or manage?" />
      {error && <p role="alert" className="rounded-sm bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}
      <Button type="submit" fullWidth loading={busy} disabled={!values.company_name.trim() || !values.registration_number.trim() || !values.contact_phone.trim()}>
        Submit application
      </Button>
      <Button type="button" variant="secondary" fullWidth disabled={busy} onClick={onBack}>Back</Button>
    </form>
  );
}
```

On success it does **not** reset `busy`: the panel immediately swaps to the "review" view, so this form unmounts.

## 7. Admin review page

A client component (it needs the browser token and click handlers) that lists pending applications and decides them. Each card owns its reject reason, so one admin can type a reason on one card without touching the others.

```tsx
// File: Frontend/src/components/templates/IssuerApplicationsPage.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { InputField } from "@/components/atoms/InputField";
import { PageHeader } from "@/components/molecules/PageHeader";
import { decideApplication, listApplications, type IssuerApplication } from "@/lib/api";

export function IssuerApplicationsPage() {
  const [apps, setApps] = useState<IssuerApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setApps(await listApplications("pending"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load applications.");
    }
  }, []);

  useEffect(() => {
    // Fetch on mount: state is set after the await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <PageHeader title="Issuer applications" description="Approving gives the applicant the issuer role." />
      {error && <p role="alert" className="rounded-sm bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}
      {apps?.length === 0 && <p className="text-grey">No pending applications.</p>}
      {apps?.map((a) => <ApplicationCard key={a.id} app={a} onDecided={load} />)}
    </div>
  );
}

function ApplicationCard({ app, onDecided }: { app: IssuerApplication; onDecided: () => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      await decideApplication(app.id, action, reason);
      await onDecided(); // the list reloads and this card disappears
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-sm border border-charcoal/20 p-5">
      <div>
        <h2 className="text-lg font-semibold">{app.company_name}</h2>
        <p className="text-sm text-grey">
          Reg. {app.registration_number} · {app.contact_phone} · applied {new Date(app.created_at).toLocaleDateString()}
        </p>
        {app.description && <p className="mt-2 text-sm">{app.description}</p>}
      </div>
      <InputField label="Reason (required to reject)" name={`reason-${app.id}`} value={reason} disabled={busy}
        onChange={(e) => setReason(e.target.value)} />
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <div className="flex gap-3">
        <Button loading={busy} onClick={() => void decide("approve")}>Approve</Button>
        <Button variant="secondary" disabled={busy || !reason.trim()} onClick={() => void decide("reject")}>Reject</Button>
      </div>
    </article>
  );
}
```

Register it in `app/[role]/[page]/page.tsx`. Add the import next to the others and one line in `PAGES`:

```tsx
import { IssuerApplicationsPage } from "@/components/templates/IssuerApplicationsPage";
```

```tsx
  "platform-admin/issuer-applications": IssuerApplicationsPage,
```

The key is `"role/slug"`, exactly the pattern of the investor pages already there. The nav item you added in `roles.ts` (section 1) points to this slug.

## 8. Run the whole thing end to end

Start both servers (Go API on 8080 with `KYC_HASH_KEY` set, Next.js on 3000).

**Investor**

1. Open `/signup`, create `investor1`. You land on `/onboarding`, with two buttons.
2. Click **I want to invest**, enter `1234 5678 9012` and any email, **Send code**.
3. Copy the code from the Go API terminal, enter it, **Verify**. You are redirected to `/investor`.
4. Sign out, sign in again: straight to `/investor`, no KYC repeat.

**Issuer**

1. Sign up `issuer1`. On `/onboarding` click **I want to list a property**, fill the form, submit. You see "waiting for approval".
2. In another browser profile, sign in as your platform admin (lesson 14, section 8). Open **Issuer applications** in the sidebar. Approve.
3. Back as `issuer1`, click **Check again** (or sign in again). You land on `/issuer-admin`.
4. Try the reject path with a second account: reject with a reason, and check the applicant sees it and can **Apply again**.

**Negative checks**

- Wrong OTP: message "that code is not correct".
- As `issuer1` before approval, `curl` the admin list with their token: `403`.
- Sign up with the same Aadhaar on a second account and verify both: the second gets "this aadhaar is already verified on another account".

## Common errors

- ESLint `react-hooks/set-state-in-effect`: this repo's lint config flags fetch-on-mount effects. The `eslint-disable-next-line` comment above the `void load();` line is intentional; keep it.
- Stuck on "Loading…": the Go API is not running or CORS rejects it. Check the browser network tab and `CORS_ALLOWED_ORIGIN`.
- Redirect loop between `/` and `/onboarding`: the token call fails (`401`). Sign out and in; check `AUTH_ISSUER` matches `BETTER_AUTH_URL` exactly.
- Admin sidebar shows the new item but the page says "Coming soon.": the `PAGES` key does not exactly match `platform-admin/issuer-applications`.
- Existing test accounts skip onboarding: they still hold `investor` from the old lazy rule. Delete their `user_roles` row (lesson 12).
- TypeScript: `Property 'application' does not exist`: `getMyApplication` return type was mistyped; it wraps the value in `{ application }`.

## Checkpoint

- [ ] New sign-up lands on `/onboarding`, and a user with a role never sees it.
- [ ] Investor flow ends on `/investor` with the OTP read from the API log.
- [ ] Issuer flow: pending page, admin approves, issuer lands on `/issuer-admin`.
- [ ] Rejected applicant sees the reason and can reapply.
- [ ] I can explain why `load()` is called after each success instead of redirecting directly.

## What is not enforced yet

- **`/[role]` pages are not gated by role in the browser.** `[role]/layout.tsx` only checks that you are signed in, so a user with no role can type `/investor` and see the demo pages. Real data will be protected by `RequireRole` in Go, as the README says; add role-gated endpoints before the dashboards show anything real.
- KYC has no resend cooldown or rate limit (lesson 13 lists the gaps).
- Email is not really sent; the OTP is in the server log.
