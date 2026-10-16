// La présentation « Bienvenue » en trois paliers, montrée une seule fois au premier lancement (voir Bienvenue.tsx).
// Ici : les paliers, et quand l'ouvrir. Tout est pur et testé ; le composant ne fait que lire le navigateur.

import type { IconName } from "@/components/Icon";

/** Note laissée dans la mémoire du téléphone : la présentation a été vue, elle ne revient plus. */
export const CLE_BIENVENUE = "demarche-bi:bienvenue-vue";

/** Le paramètre d'adresse qui rouvre la présentation (lien « Revoir la présentation ») : `/?presentation`. */
export const PARAMETRE_PRESENTATION = "presentation";

export type StockageLocal = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Palier = { titre: string; texte: string; icone: IconName };

export const PALIERS: readonly Palier[] = [
  { titre: "Pose ta question", texte: "Parle ou écris, en français ou en wolof.", icone: "micro" },
  {
    titre: "Une réponse avec ses sources",
    texte: "Pièces, coût, délai, lieu : tout vient d’une page officielle, avec sa date de vérification.",
    icone: "dossier",
  },
  {
    titre: "Je ne devine pas",
    texte: "Si je ne sais pas, je te le dis. Et ça marche même sans connexion.",
    icone: "bouclier",
  },
];

/** La mémoire du téléphone, ou rien hors du navigateur ou quand elle est bloquée (navigation privée, réglages). */
export function stockageLocal(): StockageLocal | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Vrai si la note existe ; faux sans stockage ou quand il est bloqué. */
export function aDejaVu(stockage: StockageLocal | undefined): boolean {
  try {
    return stockage?.getItem(CLE_BIENVENUE) != null;
  } catch {
    return false;
  }
}

/** Note que la présentation a été vue. Ne plante jamais : le stockage est parfois bloqué. */
export function marquerVue(stockage: StockageLocal | undefined): void {
  try {
    stockage?.setItem(CLE_BIENVENUE, "1");
  } catch {
    // Sans mémoire, on ne la remontrera pas non plus (voir fautMontrer).
  }
}

/** Vrai si l'adresse demande la présentation (`?presentation` ou `?presentation=1`). */
export function presentationDemandee(recherche: string): boolean {
  return new URLSearchParams(recherche).has(PARAMETRE_PRESENTATION);
}

/**
 * Faut-il ouvrir la présentation ? Oui si l'adresse la demande ; sinon oui tant qu'elle n'a pas été vue.
 * Stockage absent ou bloqué : non (on ne la montrerait à chaque visite, sans pouvoir s'en souvenir).
 */
export function fautMontrer({ stockage, recherche }: { stockage: StockageLocal | undefined; recherche: string }): boolean {
  if (presentationDemandee(recherche)) return true;
  if (!stockage) return false;
  try {
    return stockage.getItem(CLE_BIENVENUE) == null;
  } catch {
    return false;
  }
}
