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

const CLE_NON_COMPTE = "demarche-bi:non-compte";

/** Vrai sur un appareil de test : ses questions et ses passages ne comptent pas dans les chiffres du back-office. */
export function appareilExclu(stockage: StockageLocal | undefined): boolean {
  try {
    return stockage?.getItem(CLE_NON_COMPTE) === "oui";
  } catch {
    return false;
  }
}

export function choisirAppareilExclu(stockage: StockageLocal | undefined, exclu: boolean): void {
  try {
    if (exclu) stockage?.setItem(CLE_NON_COMPTE, "oui");
    else stockage?.removeItem(CLE_NON_COMPTE);
  } catch {
    // Sans mémoire, l'appareil reste compté.
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
