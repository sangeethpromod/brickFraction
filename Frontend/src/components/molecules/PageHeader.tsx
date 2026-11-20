export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-8 flex flex-col gap-2">
      <h1 className="font-serif text-4xl leading-[1.1] tracking-[-0.01em]">{title}</h1>
      {description && <p className="max-w-[60ch] text-[15px] text-grey">{description}</p>}
    </header>
  );
}
