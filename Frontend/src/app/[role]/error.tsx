"use client";

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-6xl rounded-sm border border-line bg-surface p-6 text-sm">
      <p className="font-medium">Something went wrong loading this page.</p>
      <button type="button" onClick={reset} className="mt-3 h-9 cursor-pointer rounded-sm bg-charcoal px-4 font-medium text-ivory focus-visible:outline-2 focus-visible:outline-bronze">Try again</button>
    </div>
  );
}
