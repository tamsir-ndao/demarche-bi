import { domaine, formaterDate, resumeSources, type Source } from "@/lib/fiches/affichage";
import { Icon } from "./Icon";

/** Les pages officielles d'où vient la fiche, avec la date où elles ont été consultées. */
export function ListeSources({ sources }: { sources: Source[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {sources.map((source) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-2xl bg-tint px-3.5 py-3 transition-colors hover:bg-tint-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-5 font-semibold">{source.titre}</span>
              <span className="block text-[13px] leading-[18px] text-ink-2">
                {domaine(source.url)} · consultée le {formaterDate(source.consulte_le)}
              </span>
            </span>
            <Icon name="lien-externe" size={18} className="flex-none" />
            <span className="sr-only">(s’ouvre dans un nouvel onglet)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Une ligne qui résume les sources et qui s'ouvre pour les montrer. */
export function SourcesRepliables({ sources }: { sources: Source[] }) {
  const { titre, detail } = resumeSources(sources);
  return (
    <details className="group rounded-3xl bg-card">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-3xl py-3 pr-[18px] pl-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-tint text-leaf">
          <Icon name="institution" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-5 font-bold">{titre}</span>
          <span className="block text-[13px] leading-[18px] text-ink-2">{detail}</span>
        </span>
        <Icon name="chevron-bas" className="flex-none transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-3.5">
        <ListeSources sources={sources} />
      </div>
    </details>
  );
}
