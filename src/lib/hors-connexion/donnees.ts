import type { Categorie } from "../fiches/affichage";
import type { Fiche } from "../fiches/schema";

// Ce que le téléphone garde pour marcher sans connexion (voir public/sw.js) : la liste des pages à copier,
// et les fiches pour chercher une démarche par mots quand l'IA n'est pas joignable.
// Ce fichier est aussi chargé par la page « hors connexion » : il n'importe rien de lourd.

export const URL_DONNEES = "/hors-connexion/donnees.json";
export const PAGE_HORS_CONNEXION = "/hors-connexion";

/** Une démarche dans une liste : de quoi dessiner sa carte (le titre, le coût et le délai sont déjà écrits). */
export type CarteHorsConnexion = { slug: string; titre: string; detail: string; categorie: Categorie };

export type DonneesHorsConnexion = {
  /** Les pages que le service worker copie sur le téléphone. */
  pages: string[];
  /** Les fiches que le site peut montrer (les mêmes que sur les pages), pour la recherche par mots. */
  fiches: Fiche[];
  /** Une carte par fiche, dans le même ordre. */
  cartes: CarteHorsConnexion[];
};

/** Les pages à copier : l'accueil, la liste, chaque fiche visible, les pages d'information et la page « hors connexion ». */
export function pagesAGarder(fiches: Pick<Fiche, "slug">[]): string[] {
  return ["/", "/demarches", ...fiches.map((fiche) => `/demarches/${fiche.slug}`), "/projet", "/a-propos", PAGE_HORS_CONNEXION];
}

function estTexte(valeur: unknown): valeur is string {
  return typeof valeur === "string";
}

/**
 * Vérifie la forme du fichier lu sur le téléphone (une copie abîmée ne doit pas casser la page).
 * Les fiches ou cartes inutilisables sont écartées ; `null` si le fichier n'a pas la bonne forme.
 */
export function lireDonnees(brut: unknown): Pick<DonneesHorsConnexion, "fiches" | "cartes"> | null {
  if (typeof brut !== "object" || brut === null) return null;
  const { fiches, cartes } = brut as Record<string, unknown>;
  if (!Array.isArray(fiches) || !Array.isArray(cartes)) return null;
  return {
    fiches: fiches.filter(
      (f): f is Fiche =>
        typeof f === "object" &&
        f !== null &&
        estTexte(f.slug) &&
        estTexte(f.titre) &&
        estTexte(f.resume) &&
        estTexte(f.corps) &&
        Array.isArray(f.mots_cles) &&
        Array.isArray(f.etapes) &&
        Array.isArray(f.pieces),
    ),
    cartes: cartes.filter(
      (c): c is CarteHorsConnexion =>
        typeof c === "object" && c !== null && estTexte(c.slug) && estTexte(c.titre) && estTexte(c.detail) && estTexte(c.categorie),
    ),
  };
}
