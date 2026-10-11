// Fiches FICTIVES pour les tests de src/lib/ai : aucun montant ni aucune information administrative réelle.
// Ce fichier ne sert qu'aux tests ; il ne doit jamais être importé par le code de l'application.
import type { Fiche } from "../fiches/schema";

export function ficheDeTest(surcharges: Partial<Fiche> & Pick<Fiche, "slug" | "titre">): Fiche {
  return {
    categorie: "autre",
    resume: "Résumé de test sans information administrative réelle.",
    mots_cles: ["test", "exemple", "fictif"],
    pieces: [],
    etapes: ["Étape de test"],
    cout: null,
    delai: null,
    lieu: null,
    sources: [{ titre: "Source de test", url: "https://example.org", consulte_le: "2026-10-11" }],
    statut: "verifie",
    verifie_le: "2026-10-11",
    verifie_par: "testeur",
    corps: "",
    ...surcharges,
  };
}
