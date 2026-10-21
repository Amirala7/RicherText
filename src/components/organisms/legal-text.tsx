// Legal text (Phase 5): the editor's reading column (68ch, base 16, line
// height 1.65); title xl, section headings lg, gap s-6 between sections and
// s-3 inside them. Template copy for a demo project, not legal advice.
export type LegalSection = { heading: string; body: string[] };

export function LegalText({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <article className="mx-auto flex max-w-[68ch] flex-col gap-8 text-base leading-[1.65]">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-xl">{title}</h1>
        <p className="m-0 text-sm text-muted-foreground">
          Last updated {updated}. RicherText is a demo project: this page is a
          template, not a real agreement.
        </p>
      </header>
      {sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-3">
          <h2 className="m-0 text-lg">{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p} className="m-0">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
