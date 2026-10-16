// Quand la question a été posée à voix haute, la réponse se lit toute seule (comme une conversation). Le bouton
// « Chercher la réponse » laisse une note dans la mémoire de l'onglet ; la page de réponse la trouve, la prend,
// et lit. Sans note (question écrite, page rechargée, lien partagé), rien ne se lit sans l'appui sur « Écouter ».

export const CLE_LECTURE_AUTO = "demarche-bi:lecture-automatique";

/** La réponse a ce temps pour arriver (l'IA peut être lente) ; après, la note est périmée. */
export const DUREE_DEMANDE_MS = 90_000;

export type StockageSession = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** La mémoire de l'onglet (elle disparaît à sa fermeture), ou rien hors du navigateur ou quand elle est bloquée. */
export function stockageDeLOnglet(): StockageSession | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Note que la prochaine réponse doit être lue. Ne plante jamais : le stockage est parfois bloqué. */
export function demanderLaLecture(stockage: StockageSession | undefined, maintenantMs: number): void {
  try {
    stockage?.setItem(CLE_LECTURE_AUTO, String(maintenantMs));
  } catch {
    // Pas de lecture automatique : le bouton « Écouter » reste disponible.
  }
}

/** Vrai une seule fois après une demande récente. La note est retirée dans tous les cas. */
export function consommerLaDemande(stockage: StockageSession | undefined, maintenantMs: number): boolean {
  try {
    const brut = stockage?.getItem(CLE_LECTURE_AUTO);
    stockage?.removeItem(CLE_LECTURE_AUTO);
    if (!brut) return false;
    const demandeLe = Number(brut);
    const ecoule = maintenantMs - demandeLe;
    return Number.isFinite(demandeLe) && ecoule >= 0 && ecoule < DUREE_DEMANDE_MS;
  } catch {
    return false;
  }
}

/**
 * Après une lecture automatique sur un écran intermédiaire (précision) : repose la note, datée de maintenant, pour que
 * la page choisie ensuite se lise aussi toute seule. Seul `BoutonEcouter` l'appelle, et seulement juste après une
 * consommation vraie : sans cette garde, une page ouverte sans la voix se mettrait à lire. Ne plante jamais.
 */
export function prolongerLaDemande(stockage: StockageSession | undefined, maintenantMs: number): void {
  demanderLaLecture(stockage, maintenantMs);
}

/** La conversation vocale s'arrête là (retour à l'accueil, annulation) : plus de lecture automatique. Ne plante jamais. */
export function oublierLaDemande(stockage: StockageSession | undefined): void {
  try {
    stockage?.removeItem(CLE_LECTURE_AUTO);
  } catch {
    // La note périme d'elle-même en 90 secondes.
  }
}
