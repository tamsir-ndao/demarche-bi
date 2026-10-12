import type { Fiche } from "@/lib/fiches/schema";
import { Icon, type IconName } from "./Icon";

type FaitProps = { icone: IconName; libelle: string; valeur: string | null; repere: string };

/** Au-delà de cette longueur, le texte de la fiche passe en plus petit pour rester lisible. */
const LONGUEUR_COURTE = 50;

function Fait({ icone, libelle, valeur, repere }: FaitProps) {
  const connu = valeur !== null;
  return (
    <li data-lecture={repere} className="flex items-center gap-3.5 py-3.5">
      <span
        className={`flex size-10 flex-none items-center justify-center rounded-full text-leaf ${
          connu ? "bg-card" : "border-[1.5px] border-dashed border-edge"
        }`}
      >
        <Icon name={icone} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] leading-4 text-ink-2">{libelle}</p>
        {connu ? (
          <p className={valeur.length > LONGUEUR_COURTE ? "text-base leading-6 font-semibold" : "text-lg leading-6 font-bold"}>
            {valeur}
          </p>
        ) : (
          <>
            <p className="text-lg leading-6 font-bold text-ink-2">Non précisé</p>
            <p className="text-[13px] leading-[18px] text-ink-2">La source ne le dit pas.</p>
          </>
        )}
      </div>
    </li>
  );
}

/** Le coût, le délai et le lieu, tels que la fiche les donne. Ce qu'elle ne dit pas reste « Non précisé ». */
export function FaitsCles({ fiche }: { fiche: Pick<Fiche, "cout" | "delai" | "lieu"> }) {
  return (
    <ul className="mt-4 divide-y divide-hair rounded-[20px] bg-tint px-4 py-1">
      <Fait icone="billet" libelle="Coût" valeur={fiche.cout} repere="cout" />
      <Fait icone="horloge" libelle="Délai" valeur={fiche.delai} repere="delai" />
      <Fait icone="lieu" libelle="Où" valeur={fiche.lieu} repere="lieu" />
    </ul>
  );
}
