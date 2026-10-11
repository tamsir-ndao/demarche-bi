import { Icon } from "./Icon";

// Ce que le site fait vraiment pour répondre (comprendre, chercher dans la fiche, contrôler la phrase). Le serveur ne dit
// pas où il en est : on montre donc des points qui respirent, pas des cases cochées.
const ETAPES = [
  { libelle: "Je lis ta question", decalage: "" },
  { libelle: "Je cherche dans les sources officielles", decalage: "[animation-delay:0.6s]" },
  { libelle: "Je vérifie les chiffres", decalage: "[animation-delay:1.2s]" },
];

/** Ce qu'on voit pendant que la réponse se prépare. */
export function Recherche() {
  return (
    <section
      role="status"
      aria-labelledby="titre-recherche"
      className="mt-10 flex flex-col items-center text-center"
    >
      <span aria-hidden="true" className="relative flex size-[168px] items-center justify-center">
        <span className="absolute inset-0 animate-breathe rounded-full bg-tint" />
        <span className="absolute inset-[18px] animate-breathe rounded-full bg-tint-2 [animation-delay:0.5s]" />
        <span className="relative flex size-24 items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_12px_28px_rgb(34_209_131_/_0.45)]">
          <Icon name="loupe" size={42} />
        </span>
      </span>
      <h1 id="titre-recherche" className="mt-4 text-[30px] leading-9 font-bold tracking-[-0.01em]">
        Je cherche…
      </h1>
      <ol className="mt-6 w-full rounded-3xl bg-card px-[18px] py-1.5 text-left shadow-soft">
        {ETAPES.map(({ libelle, decalage }) => (
          <li key={libelle} className="flex min-h-14 items-center gap-3.5 border-b border-line last:border-b-0">
            <span aria-hidden="true" className="relative flex size-7 flex-none items-center justify-center">
              <span className={`absolute inset-0 animate-breathe rounded-full bg-tint-2 ${decalage}`} />
              <span className="relative size-2.5 rounded-full bg-leaf" />
            </span>
            <span className="text-base leading-6 font-semibold">{libelle}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
