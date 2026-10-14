// La boucle de `evaluerBoutEnBout` (bout-en-bout.ts), sans rien de propre aux questions : on passe les éléments un par un,
// jamais en parallèle, avec une pause entre deux pour ménager le quota gratuit du modèle. Les autres mesures (pièges,
// fidélité, répétition) s'en servent pour ne pas recopier la boucle.

export type OptionsParcours<R> = {
  /** Attente entre deux éléments (pas avant le premier, pas après le dernier). Zéro ou absent : aucune pause. */
  pauseMs?: number;
  /** Remplace l'attente réelle (tests). */
  dormir?: (ms: number) => Promise<void>;
  /** Appelé dès qu'un élément est traité (pour afficher l'avancement), avant la pause suivante. */
  surResultat?: (resultat: R, index: number) => void;
};

const dormirVraiment = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Passe chaque élément de `items` dans `poser`, l'un après l'autre, et rend les résultats dans le même ordre.
 * Si `poser` échoue, le parcours s'arrête et l'erreur remonte : à `poser` de la rattraper pour continuer.
 */
export async function parcourirAvecPause<Q, R>(
  items: readonly Q[],
  poser: (item: Q, index: number) => Promise<R>,
  { pauseMs = 0, dormir = dormirVraiment, surResultat }: OptionsParcours<R> = {},
): Promise<R[]> {
  const resultats: R[] = [];
  for (const [index, item] of items.entries()) {
    if (index > 0 && pauseMs > 0) await dormir(pauseMs);
    const resultat = await poser(item, index);
    resultats.push(resultat);
    surResultat?.(resultat, index);
  }
  return resultats;
}
