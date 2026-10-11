// Deux petits outils en mémoire pour ménager le quota gratuit du modèle (voir docs/ARCHITECTURE.md). Ils vivent
// le temps de l'instance du serveur : sur Vercel, ils aident sans rien garantir, et un redémarrage les vide.

type OptionsCache = { max: number; dureeMs: number; maintenant?: () => number };

export type Cache<T> = {
  lire(cle: string): T | undefined;
  ecrire(cle: string, valeur: T): void;
};

/** Garde au plus `max` valeurs pendant `dureeMs` ; au-delà, les plus anciennes sont oubliées. */
export function creerCache<T>({ max, dureeMs, maintenant = Date.now }: OptionsCache): Cache<T> {
  const valeurs = new Map<string, { valeur: T; expire: number }>();

  return {
    lire(cle) {
      const entree = valeurs.get(cle);
      if (!entree) return undefined;
      if (entree.expire <= maintenant()) {
        valeurs.delete(cle);
        return undefined;
      }
      return entree.valeur;
    },
    ecrire(cle, valeur) {
      valeurs.delete(cle);
      valeurs.set(cle, { valeur, expire: maintenant() + dureeMs });
      for (const plusAncienne of valeurs.keys()) {
        if (valeurs.size <= max) break;
        valeurs.delete(plusAncienne);
      }
    },
  };
}

type OptionsLimiteur = { max: number; fenetreMs: number; maintenant?: () => number };

/** Nombre de visiteurs suivis à partir duquel on oublie ceux dont toutes les demandes sont sorties de la fenêtre. */
const SEUIL_DE_NETTOYAGE = 5000;

/** Autorise au plus `max` demandes par visiteur sur les `fenetreMs` dernières millisecondes. */
export function creerLimiteur({ max, fenetreMs, maintenant = Date.now }: OptionsLimiteur) {
  const demandes = new Map<string, number[]>();

  return {
    /** Vrai si la demande est permise (et comptée) ; faux si le visiteur a déjà atteint la limite. */
    autoriser(cle: string): boolean {
      const instant = maintenant();
      const recentes = (demandes.get(cle) ?? []).filter((moment) => moment > instant - fenetreMs);
      const permis = recentes.length < max;
      if (permis) recentes.push(instant);
      demandes.set(cle, recentes);

      if (demandes.size > SEUIL_DE_NETTOYAGE) {
        for (const [visiteur, moments] of demandes) {
          if (moments.every((moment) => moment <= instant - fenetreMs)) demandes.delete(visiteur);
        }
      }
      return permis;
    },
  };
}
