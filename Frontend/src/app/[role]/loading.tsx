export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8" role="status" aria-label="Loading">
      <div className="h-10 w-72 animate-pulse rounded-sm bg-line" />
      <div className="h-40 animate-pulse rounded-sm bg-line" />
      <div className="h-72 animate-pulse rounded-sm bg-line" />
    </div>
  );
}
