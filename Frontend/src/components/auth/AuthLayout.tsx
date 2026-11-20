import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-dvh overflow-hidden max-[720px]:h-auto max-[720px]:min-h-dvh max-[720px]:overflow-visible max-[720px]:bg-ivory">
      {/* fixed full-viewport photo: never scrolls or stretches with the content */}
      <div className="fixed inset-0 bg-[url('/bg.png')] bg-cover bg-center max-[720px]:hidden" aria-hidden="true" />
      <div className="hidden h-[200px] bg-[url('/bg.png')] bg-cover bg-center max-[720px]:block" aria-hidden="true" />
      <main
        className={[
          // glass: translucent ivory gradient + heavy backdrop blur/saturation + light edge and inner highlight
          "relative m-[5px] flex h-[calc(100dvh-10px)] w-[clamp(420px,40%,640px)] flex-col overflow-y-auto rounded-sm px-16 py-8",
          "bg-linear-to-br from-ivory/80 to-ivory/50 backdrop-blur-[64px] backdrop-saturate-150",
          "border border-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_32px_rgba(0,0,0,0.18)]",
          "max-[1024px]:w-[clamp(380px,50%,520px)] max-[1024px]:px-10",
          "max-[720px]:m-0 max-[720px]:h-auto max-[720px]:min-h-[calc(100dvh-200px)] max-[720px]:overflow-visible max-[720px]:w-full max-[720px]:rounded-none max-[720px]:border-0 max-[720px]:bg-ivory max-[720px]:bg-none max-[720px]:p-6 max-[720px]:shadow-none max-[720px]:backdrop-blur-none",
        ].join(" ")}
      >
        <span className="text-[21px] font-bold tracking-[-0.01em]">BrickFraction</span>
        <div className="flex w-full max-w-[420px] flex-1 flex-col justify-center py-12 max-[720px]:max-w-none max-[720px]:justify-start max-[720px]:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
