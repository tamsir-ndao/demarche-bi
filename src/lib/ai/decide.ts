import type { Fiche } from "../fiches/schema";
import type { Comprehension } from "./schemas";

// Étape « Décider » de /api/ask : écrite en code, pas par le modèle. Selon ce que le modèle a compris, on répond,
// on demande une précision ou on dit « je ne sais pas ». Les identifiants du modèle sont revérifiés ici :
// une démarche qui ne figure pas dans les fiches disponibles est ignorée.

export type Decision =
  /** Une démarche répond à la question. */
  | { type: "fiche"; fiche: Fiche }
  /** Plusieurs démarches pourraient convenir : l'utilisateur choisit parmi `options`. `question` peut être vide. */
  | { type: "precision"; options: Fiche[]; question: string }
  /** Question trop vague, sans démarche à proposer. `question` peut être vide. */
  | { type: "precision_generale"; question: string }
  /** Aucune démarche connue ne répond : « je ne sais pas encore ». */
  | { type: "inconnue" };

export function decider(comprise: Comprehension, fiches: Fiche[]): Decision {
  const choisies = comprise.demarches.flatMap((slug) => fiches.find((fiche) => fiche.slug === slug) ?? []);

  if (comprise.besoin_precision) {
    return choisies.length >= 2
      ? { type: "precision", options: choisies, question: comprise.question_precision }
      : { type: "precision_generale", question: comprise.question_precision };
  }
  if (choisies.length === 0) return { type: "inconnue" };
  if (choisies.length === 1) return { type: "fiche", fiche: choisies[0] };
  return { type: "precision", options: choisies, question: comprise.question_precision };
}
