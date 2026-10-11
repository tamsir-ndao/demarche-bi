import { libelleCategorie, type Categorie, type StatutAffichage } from "@/lib/fiches/affichage";
import { Icon, iconeCategorie } from "./Icon";

const PASTILLE = "inline-flex items-center gap-1.5 rounded-full py-[5px] pr-3 text-[13px] leading-[18px] font-bold";

/** Dit si la démarche a été relue : la date vient de la fiche, jamais d'ailleurs. */
export function PastilleStatut({ statut }: { statut: StatutAffichage }) {
  if (statut.type === "brouillon") {
    return <p className={`${PASTILLE} border-[1.5px] border-dashed border-edge pl-3 text-ink`}>{statut.libelle}</p>;
  }
  const perimee = statut.type === "perimee";
  return (
    <p className={`${PASTILLE} pl-2 text-leaf-deep ${perimee ? "bg-tint-2" : "bg-tint"}`}>
      <Icon name={perimee ? "horloge" : "bouclier"} size={16} strokeWidth={2.4} />
      {statut.libelle}
    </p>
  );
}

export function PastilleCategorie({ categorie }: { categorie: Categorie }) {
  return (
    <p className={`${PASTILLE} bg-tint-2 pl-2`}>
      <Icon name={iconeCategorie(categorie)} size={16} className="text-leaf-deep" />
      {libelleCategorie(categorie)}
    </p>
  );
}

/** Petite étiquette collée à une information que la fiche demande de confirmer. */
export function EtiquetteAConfirmer() {
  return (
    <span className="ml-1 inline-block rounded-full bg-tint px-2 py-0.5 align-[2px] text-xs leading-4 font-bold text-leaf-deep">
      à confirmer
    </span>
  );
}
