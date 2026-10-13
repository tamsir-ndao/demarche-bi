// Le téléphone met ses copies à jour au plus une fois par demi-journée : les pages pèsent peu mais le réseau est parfois lent.

export const DELAI_RAFRAICHISSEMENT_MS = 12 * 60 * 60 * 1000;

/** Vrai quand la dernière mise à jour des copies est absente, trop vieille, ou datée du futur (horloge changée). */
export function fautRafraichir(derniere: number | null, maintenant: number): boolean {
  if (derniere === null || !Number.isFinite(derniere)) return true;
  return derniere > maintenant || maintenant - derniere >= DELAI_RAFRAICHISSEMENT_MS;
}
