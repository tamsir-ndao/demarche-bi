import { nettoyerQuestion, nettoyerSlug } from "../texte";

// Ce que POST /api/ask accepte : { "question": "…", "fiche": "identifiant-de-la-demarche" } (fiche est facultatif).

export type DemandeApi =
  | { ok: true; question: string; ficheSlug: string | undefined }
  | { ok: false; erreur: string };

function enTexte(valeur: unknown): string | undefined {
  return typeof valeur === "string" ? valeur : undefined;
}

/** Lit le corps JSON d'une demande. La question est mise sur une ligne et coupée à la limite du champ de saisie. */
export function lireDemandeApi(corps: unknown): DemandeApi {
  if (typeof corps !== "object" || corps === null || Array.isArray(corps)) {
    return { ok: false, erreur: "Envoie un objet JSON avec une « question » (du texte)." };
  }
  const { question: brute, fiche } = corps as Record<string, unknown>;

  const texte = enTexte(brute);
  if (texte === undefined) return { ok: false, erreur: "La « question » doit être du texte." };

  const question = nettoyerQuestion(texte);
  if (question === "") return { ok: false, erreur: "La question est vide." };

  return { ok: true, question, ficheSlug: nettoyerSlug(enTexte(fiche)) };
}
