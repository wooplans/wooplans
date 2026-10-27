/**
 * Description d'un modèle, mise en forme à partir du texte saisi : paragraphes d'introduction,
 * sections par niveau (« - RDC : », « - ETAGE : ») avec leurs pièces en liste, et l'estimation
 * du gros œuvre mise en avant. Un texte sans structure s'affiche simplement en paragraphes.
 */

type Item = { label: string | null; text: string };
type Section = { title: string | null; items: Item[] };
type Parsed = { intro: string[]; sections: Section[]; outro: string[]; budget: string | null };

/** Titres de section saisis en abrégé ou en majuscules. */
const SECTION_TITLES: Record<string, string> = {
  rdc: "Rez-de-chaussée",
  "rez de chaussee": "Rez-de-chaussée",
  "rez-de-chaussee": "Rez-de-chaussée",
  etage: "Étage",
  "1er etage": "1er étage",
  composition: "Composition",
};

function plain(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function tidy(s: string) {
  const t = s.replace(/\s+([.,])/g, "$1").replace(/\s{2,}/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function sectionTitle(raw: string) {
  const known = SECTION_TITLES[plain(raw)];
  if (known) return known;
  return raw === raw.toUpperCase() ? tidy(raw.toLowerCase()) : tidy(raw);
}

function parse(description: string): Parsed {
  const lines = description.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  const parsed: Parsed = { intro: [], sections: [], outro: [], budget: null };
  let current: Section | null = null;
  for (const line of lines) {
    if (!line) continue;
    if (/^gros (œ|oe)uvre\s*:/i.test(line)) {
      parsed.budget = line.replace(/^gros (œ|oe)uvre\s*:\s*/i, "");
      continue;
    }
    const bullet = line.match(/^[-•*]\s*(.+)$/);
    if (!bullet) {
      // « Caractéristiques : » annonce simplement la liste qui suit.
      if (/^caract[ée]ristiques\s*:?$/i.test(line)) continue;
      (parsed.sections.length ? parsed.outro : parsed.intro).push(tidy(line));
      continue;
    }
    const body = bullet[1];
    const heading = body.match(/^(.+?)\s*:$/);
    if (heading) {
      current = { title: sectionTitle(heading[1]), items: [] };
      parsed.sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: null, items: [] };
      parsed.sections.push(current);
    }
    const labelled = body.match(/^([^:]{2,40}?)\s*:\s*(.+)$/);
    current.items.push(labelled ? { label: tidy(labelled[1]), text: tidy(labelled[2]) } : { label: null, text: tidy(body) });
  }
  parsed.sections = parsed.sections.filter((s) => s.items.length);
  return parsed;
}

export function PlanDescription({ description }: { description: string }) {
  const { intro, sections, outro, budget } = parse(description);
  return (
    <div className="mt-3">
      {intro.map((p) => (
        <p key={p.slice(0, 40)} className="mb-3 leading-relaxed text-foreground/80">{p}</p>
      ))}

      {sections.length ? (
        <div className={`mt-5 grid gap-4 ${sections.length > 1 ? "md:grid-cols-2" : ""}`}>
          {sections.map((section, i) => (
            <div key={`${section.title}-${i}`} className="card p-4">
              {section.title ? (
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">{section.title}</h3>
              ) : null}
              <ul className="space-y-2.5">
                {section.items.map((item) => (
                  <li key={item.label ?? item.text} className="flex gap-2.5 text-sm leading-snug">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span className="text-foreground/80">
                      {item.label ? <strong className="font-semibold text-foreground">{item.label}</strong> : null}
                      {item.label ? <br /> : null}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {outro.map((p) => (
        <p key={p.slice(0, 40)} className="mt-4 leading-relaxed text-foreground/80">{p}</p>
      ))}

      {budget ? (
        <p className="mt-5 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground/80">
          <span className="font-semibold text-foreground">Gros œuvre :</span> {budget}
        </p>
      ) : null}
    </div>
  );
}
