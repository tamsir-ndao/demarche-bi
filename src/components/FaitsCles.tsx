import type { Fiche } from "@/lib/fiches/schema";
import { abreger } from "@/lib/voix/lecture";
import { Icon, type IconName } from "./Icon";

type Variante = "complete" | "compacte";

type FaitProps = { icone: IconName; libelle: string; valeur: string | null; repere: string; variante: Variante };

/** Au-delà de cette longueur, le texte de la fiche passe en plus petit pour rester lisible. */
const LONGUEUR_COURTE = 50;

/** Dans la réponse, un délai ou un lieu plus long que ça n'est montré que jusqu'à son premier « ; » ou sa première phrase. */
const LONGUEUR_MAX_COMPACTE = 60;

function Fait({ icone, libelle, valeur, repere, variante }: FaitProps) {
  const connu = valeur !== null;
  const compacte = variante === "compacte";
  return (
    <li data-lecture={repere} className={`flex items-center gap-3.5 ${compacte ? "py-2.5" : "py-3.5"}`}>
      <span
        className={`flex flex-none items-center justify-center rounded-full text-leaf ${compacte ? "size-8" : "size-10"} ${
          connu ? "bg-card" : "border-[1.5px] border-dashed border-edge"
        }`}
      >
        <Icon name={icone} size={compacte ? 18 : 24} />
      </span>
      <div className="min-w-0">
        <p className={compacte ? "text-xs leading-4 text-ink-2" : "text-[13px] leading-4 text-ink-2"}>{libelle}</p>
        {connu ? (
          <p
            className={
              compacte || valeur.length > LONGUEUR_COURTE ? "text-base leading-6 font-semibold" : "text-lg leading-6 font-bold"
            }
          >
            {valeur}
          </p>
        ) : (
          <>
            <p className={`${compacte ? "text-base" : "text-lg"} leading-6 font-bold text-ink-2`}>Non précisé</p>
            {compacte ? null : <p className="text-[13px] leading-[18px] text-ink-2">La source ne le dit pas.</p>}
          </>
        )}
      </div>
    </li>
  );
}

/** Dans la réponse, le délai et le lieu sont coupés comme la voix les dit : jamais au milieu d'une phrase, « … » à la fin. */
function enCourt(valeur: string | null): string | null {
  if (valeur === null) return null;
  const { texte, coupe } = abreger(valeur, LONGUEUR_MAX_COMPACTE);
  return coupe ? `${texte} …` : texte;
}

/**
 * Le coût, le délai et le lieu, tels que la fiche les donne. Ce qu'elle ne dit pas reste « Non précisé ».
 * `compacte` (la réponse) : lignes serrées, délai et lieu abrégés ; le coût n'est jamais abrégé. La fiche complète
 * garde tout.
 */
export function FaitsCles({ fiche, variante = "complete" }: { fiche: Pick<Fiche, "cout" | "delai" | "lieu">; variante?: Variante }) {
  const compacte = variante === "compacte";
  return (
    <ul className={`mt-4 divide-y divide-hair rounded-[20px] bg-tint px-4 ${compacte ? "py-0.5" : "py-1"}`}>
      <Fait icone="billet" libelle="Coût" valeur={fiche.cout} repere="cout" variante={variante} />
      <Fait icone="horloge" libelle="Délai" valeur={compacte ? enCourt(fiche.delai) : fiche.delai} repere="delai" variante={variante} />
      <Fait icone="lieu" libelle="Où" valeur={compacte ? enCourt(fiche.lieu) : fiche.lieu} repere="lieu" variante={variante} />
    </ul>
  );
}
