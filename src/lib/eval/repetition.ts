import type { Reponse } from "../ai/ask";

// Même question posée plusieurs fois : le site répond-il pareil ? Le modèle n'est pas parfaitement répétable (température 0
// ne garantit rien chez le fournisseur) ; ce qui compte pour la personne, c'est la décision : la même démarche, ou le même
// type de réponse. Le texte de l'introduction, lui, peut varier sans conséquence : il n'entre pas dans la comparaison.

export type EssaiRepete = { question: string; reponses: Reponse[] };

export type ResumeRepetition = {
  question: string;
  /** Toutes les réponses sont du même type et montrent les mêmes démarches. Faux quand il n'y a aucune réponse. */
  stable: boolean;
  /** Combien de réponses de chaque type (« fiche », « precision », « inconnue »…), dans l'ordre où elles apparaissent. */
  types: Record<string, number>;
  /** Les démarches montrées (la fiche, ou les choix d'une précision), sans doublon et triées. */
  slugs: string[];
};

/** Les démarches qu'une réponse met en avant. Les fiches « voir aussi » (`autres`) viennent de la recherche par mots : elles ne comptent pas. */
function slugsDe(reponse: Reponse): string[] {
  switch (reponse.type) {
    case "fiche":
      return [reponse.fiche.slug];
    case "precision":
      return reponse.options.map((option) => option.slug);
    case "precision_generale":
    case "inconnue":
    case "hors_domaine":
    case "interdit":
    case "salutation":
      return [];
  }
}

/** Deux réponses sont « la même » quand elles ont le même type et les mêmes démarches, dans n'importe quel ordre. */
function signature(reponse: Reponse): string {
  return `${reponse.type}:${[...new Set(slugsDe(reponse))].sort().join(",")}`;
}

/** Résume, question par question, ce que le site a répondu à chaque essai. */
export function resumerRepetitions(essais: EssaiRepete[]): ResumeRepetition[] {
  return essais.map(({ question, reponses }) => {
    const types: Record<string, number> = {};
    for (const reponse of reponses) types[reponse.type] = (types[reponse.type] ?? 0) + 1;

    const slugs = [...new Set(reponses.flatMap(slugsDe))].sort();
    const signatures = new Set(reponses.map(signature));
    return { question, stable: signatures.size === 1, types, slugs };
  });
}
