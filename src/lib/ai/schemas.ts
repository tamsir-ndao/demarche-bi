import { z } from "zod";

// Schémas des sorties du modèle. Ils sont envoyés au fournisseur (mode strict) : on n'y met que des types,
// les limites de longueur sont appliquées par le code qui lit la réponse.

/** Ce que le modèle comprend de la question (étape « comprendre »). */
export const ComprehensionSchema = z.object({
  /** La question reformulée en une phrase de français standard. */
  question_claire: z.string(),
  /** Identifiants des démarches de la liste qui répondent à la question : aucune, une, ou plusieurs si elle ne tranche pas. */
  demarches: z.array(z.string()),
  /** Vrai si la question concerne l'administration mais est trop vague pour savoir de quelle démarche il s'agit. */
  besoin_precision: z.boolean(),
  /** Vide quand `besoin_precision` est faux. */
  question_precision: z.string(),
});

export type Comprehension = z.infer<typeof ComprehensionSchema>;

/** L'introduction rédigée à partir d'une seule fiche (étape « répondre »). `intro` est vide quand `trouve` est faux. */
export const ReponseIASchema = z.object({
  /** Vrai si la fiche traite de la démarche demandée. */
  trouve: z.boolean(),
  /** Une à trois phrases qui répondent directement à la question, au tutoiement. */
  intro: z.string(),
});

export type ReponseIA = z.infer<typeof ReponseIASchema>;
