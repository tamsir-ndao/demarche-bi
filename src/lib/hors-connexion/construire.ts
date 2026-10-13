import { resumeCoutDelai } from "../fiches/affichage";
import type { Fiche } from "../fiches/schema";
import { type DonneesHorsConnexion, pagesAGarder } from "./donnees";

/** Ce que le site envoie au téléphone pour le mode sans connexion (côté serveur : l'écriture du coût et du délai vient de la fiche). */
export function donneesHorsConnexion(fiches: Fiche[]): DonneesHorsConnexion {
  return {
    pages: pagesAGarder(fiches),
    fiches,
    cartes: fiches.map((fiche) => ({ slug: fiche.slug, titre: fiche.titre, detail: resumeCoutDelai(fiche), categorie: fiche.categorie })),
  };
}
