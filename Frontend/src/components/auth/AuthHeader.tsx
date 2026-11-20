export function AuthHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8 flex flex-col gap-3">
      <h1 className="font-serif text-[40px] leading-[1.1] font-normal tracking-[-0.01em] text-balance max-[720px]:text-4xl">{title}</h1>
      <p className="max-w-[38ch] text-[15px] text-grey">{description}</p>
    </header>
  );
}
