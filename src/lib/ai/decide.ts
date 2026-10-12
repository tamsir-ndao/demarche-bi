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
  /** Une démarche administrative que le site n'a pas : « je ne sais pas encore ». `message` : la phrase du modèle, si elle a passé les garde-fous. */
  | { type: "inconnue"; message?: string }
  /** La question n'a aucun rapport avec les démarches administratives. `message` : la phrase du modèle, si elle a passé les garde-fous. */
  | { type: "hors_domaine"; message?: string };

export function decider(comprise: Comprehension, fiches: Fiche[]): Decision {
  const choisies = comprise.demarches.flatMap((slug) => fiches.find((fiche) => fiche.slug === slug) ?? []);

  if (comprise.besoin_precision) {
    return choisies.length >= 2
      ? { type: "precision", options: choisies, question: comprise.question_precision }
      : { type: "precision_generale", question: comprise.question_precision };
  }
  if (choisies.length === 0) {
    const type = comprise.hors_domaine ? "hors_domaine" : "inconnue";
    return comprise.message === "" ? { type } : { type, message: comprise.message };
  }
  if (choisies.length === 1) return { type: "fiche", fiche: choisies[0] };
  return { type: "precision", options: choisies, question: comprise.question_precision };
}
