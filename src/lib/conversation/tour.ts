import type { Reponse } from "../ai/ask";
import { decouperPiece, formaterDate, type StatutAffichage } from "../fiches/affichage";
import {
  preparerLaLecture,
  scriptFiche,
  scriptHorsDomaine,
  scriptInconnue,
  scriptInterdit,
  scriptPrecision,
  scriptPrecisionGenerale,
  scriptSalutation,
  type LigneVocale,
} from "../voix/lecture";

// Un tour de conversation : ce que l'assistant affiche et dit, préparé par le serveur à partir de la réponse du site.
// Tous les faits restent ceux de la fiche ; la seule phrase du modèle est l'introduction déjà vérifiée. Fonction pure, testée.

export type TourAssistant = {
  /** Les phrases affichées dans la bulle de l'assistant. */
  texte: string[];
  faits: { libelle: string; valeur: string }[];
  pieces: string[];
  /** La démarche dont on parle (mémoire de la conversation) et sa source. */
  fiche: { slug: string; titre: string; source: string | null } | null;
  /** Les démarches au choix quand la question ne suffit pas. */
  options: { slug: string; titre: string }[];
  /** Vrai quand la prochaine parole complète cette question, trop vague. */
  aCompleter: boolean;
  lignes: LigneVocale[];
};

function sansFiche(script: string[], options: Partial<TourAssistant> = {}): TourAssistant {
  return { texte: script, faits: [], pieces: [], fiche: null, options: [], aCompleter: false, lignes: preparerLaLecture(script), ...options };
}

/** `suite` : la conversation continue sur la même démarche ; on répond alors à la question, sans tout relire. */
export function construireTour(reponse: Reponse, { suite, statut }: { suite: boolean; statut?: StatutAffichage }): TourAssistant {
  switch (reponse.type) {
    case "fiche": {
      const { fiche, intro } = reponse;
      const script = scriptFiche({ fiche, statut: statut as StatutAffichage, intro });
      const dites = suite && intro ? script.filter(({ cible }) => cible === "statut" || cible === "intro") : script.filter(({ cible }) => cible !== "etapes");
      const source = fiche.sources[0];
      return {
        texte: [intro ?? fiche.titre],
        faits: [
          { libelle: "Coût", valeur: fiche.cout ?? "Non précisé" },
          { libelle: "Délai", valeur: fiche.delai ?? "Non précisé" },
          { libelle: "Où", valeur: fiche.lieu ?? "Non précisé" },
        ],
        pieces: fiche.pieces.map((piece) => decouperPiece(piece).principal),
        fiche: { slug: fiche.slug, titre: fiche.titre, source: source ? `${source.titre}, consultée le ${formaterDate(source.consulte_le)}` : null },
        options: [],
        aCompleter: false,
        lignes: preparerLaLecture(dites),
      };
    }
    case "precision": {
      const options = reponse.options.map(({ slug, titre }) => ({ slug, titre }));
      return sansFiche(scriptPrecision({ question: reponse.question, options }), { options });
    }
    case "precision_generale":
      return sansFiche(scriptPrecisionGenerale({ question: reponse.question }), { aCompleter: true });
    case "inconnue":
      return sansFiche(scriptInconnue(reponse.message));
    case "hors_domaine":
      return sansFiche(scriptHorsDomaine(reponse.message));
    case "interdit":
      return sansFiche(scriptInterdit(reponse.message));
    case "salutation":
      return sansFiche(scriptSalutation(reponse.titre, reponse.message));
  }
}
