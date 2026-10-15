export function ContentPage({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-12">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      <div className="prose-wp mt-8">{children}</div>
    </div>
  );
}
