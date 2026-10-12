// Surligner à l'écran ce que la voix est en train de lire. Les blocs de la page portent `data-lecture="repère"`
// (plusieurs repères possibles, séparés par une espace) ; la phrase en cours (parleur.cible) donne le repère.
// Le style du surlignage est dans globals.css (`[data-lu]`) ; ici, seulement les attributs et le défilement.

/** Le repère d'un bloc de la page. */
export const ATTRIBUT_BLOC = "data-lecture";
/** Posé sur le bloc lu pendant qu'il est lu. */
export const ATTRIBUT_LU = "data-lu";

export type ElementSurlignable = {
  setAttribute(nom: string, valeur: string): void;
  removeAttribute(nom: string): void;
  scrollIntoView?(options: { behavior: "auto" | "smooth"; block: "center" }): void;
  getBoundingClientRect?(): { top: number; bottom: number };
};

/** La page, ou une partie de la page (`document` dans le navigateur). */
export type Racine = { querySelectorAll(selecteur: string): ArrayLike<ElementSurlignable> };

export type ReglagesSurlignage = {
  /** La personne a désactivé les animations dans son téléphone : la page défile d'un coup. */
  mouvementReduit: boolean;
  /** Hauteur visible de la page, en pixels. */
  hauteurFenetre: number;
};

/** Les repères sont écrits par le site (« piece-0 », « cout ») : rien d'autre ne passe dans un sélecteur. */
const REPERE_VALIDE = /^[a-z0-9-]+$/;

/** La partie de l'écran où un bloc se lit bien : ni collé au haut (menu), ni trop bas (pouce, menu du bas). */
const ZONE_CONFORTABLE = { haut: 0.15, bas: 0.7 };

/**
 * Surligne les blocs de la page qui portent ce repère. Si le premier n'est pas bien visible, la page défile pour
 * l'amener au milieu de l'écran ; sinon elle ne bouge pas (la lecture ne secoue pas la page à chaque phrase).
 * Rend la fonction qui retire le surlignage.
 */
export function surligner(racine: Racine, repere: string, { mouvementReduit, hauteurFenetre }: ReglagesSurlignage): () => void {
  if (!REPERE_VALIDE.test(repere)) return () => {};
  const blocs = Array.from(racine.querySelectorAll(`[${ATTRIBUT_BLOC}~="${repere}"]`));
  for (const bloc of blocs) bloc.setAttribute(ATTRIBUT_LU, "");

  const premier = blocs[0];
  const position = premier?.getBoundingClientRect?.();
  const bienVisible =
    position !== undefined &&
    position.top >= ZONE_CONFORTABLE.haut * hauteurFenetre &&
    position.bottom <= ZONE_CONFORTABLE.bas * hauteurFenetre;
  if (!bienVisible) premier?.scrollIntoView?.({ behavior: mouvementReduit ? "auto" : "smooth", block: "center" });

  return () => {
    for (const bloc of blocs) bloc.removeAttribute(ATTRIBUT_LU);
  };
}
