import type { StockageLocal } from "./bienvenue";

// Le code anonyme du téléphone : tiré au hasard, il sert seulement à compter les utilisateurs (voir Réglages).

const CLE_APPAREIL = "demarche-bi:appareil";
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Vrai si la valeur reçue a la forme d'un code : le serveur ne garde rien d'autre. */
export function estCodeAppareil(valeur: unknown): valeur is string {
  return typeof valeur === "string" && FORME_UUID.test(valeur);
}

/** Le code gardé sur le téléphone, créé à la première question ; rien si la mémoire est bloquée. */
export function codeAppareil(stockage: StockageLocal | undefined, tirer: () => string = () => crypto.randomUUID()): string | undefined {
  try {
    if (!stockage) return undefined;
    const garde = stockage.getItem(CLE_APPAREIL);
    if (estCodeAppareil(garde)) return garde;
    const nouveau = tirer();
    stockage.setItem(CLE_APPAREIL, nouveau);
    return nouveau;
  } catch {
    return undefined;
  }
}
