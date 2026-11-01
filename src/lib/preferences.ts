import type { StockageLocal } from "./bienvenue";

// Les réglages de la personne, gardés sur le téléphone.

const CLE_VOIX_AUTO = "demarche-bi:voix-auto";

/** Lire les réponses à voix haute dès qu'elles arrivent : oui par défaut, et si la mémoire est bloquée. */
export function voixAutomatique(stockage: StockageLocal | undefined): boolean {
  try {
    return stockage?.getItem(CLE_VOIX_AUTO) !== "non";
  } catch {
    return true;
  }
}

export function choisirVoixAutomatique(stockage: StockageLocal | undefined, active: boolean): void {
  try {
    if (active) stockage?.removeItem(CLE_VOIX_AUTO);
    else stockage?.setItem(CLE_VOIX_AUTO, "non");
  } catch {
    // Sans mémoire, le réglage dure le temps de l'écran.
  }
}
