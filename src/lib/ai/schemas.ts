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
  /** Vrai si la question ne concerne pas une démarche administrative sénégalaise (cuisine, sport, discussion, autre pays…). */
  hors_domaine: z.boolean(),
  /** Quand aucune démarche ne répond : une phrase polie qui nomme le sujet et dit que ce n'est pas le domaine du site. Vide sinon. */
  message_hors_domaine: z.string(),
  /** Quand aucune démarche ne répond : une phrase polie qui nomme le sujet et dit que le site n'a pas encore de source. Vide sinon. */
  message_absente: z.string(),
});

/** Ce que le modèle écrit, avant que le code ne le vérifie (voir comprendre). */
export type ComprehensionBrute = z.infer<typeof ComprehensionSchema>;

/**
 * Ce que le code retient de la compréhension : les identifiants vérifiés, et `message`, la seule phrase qui sert (celle
 * du cas retenu, si elle a passé les garde-fous ; sinon vide).
 */
export type Comprehension = Omit<ComprehensionBrute, "message_hors_domaine" | "message_absente"> & { message: string };

/** L'introduction rédigée à partir d'une seule fiche (étape « répondre »). `intro` est vide quand `trouve` est faux. */
export const ReponseIASchema = z.object({
  /** Vrai si la fiche traite de la démarche demandée. */
  trouve: z.boolean(),
  /** Une à trois phrases qui répondent directement à la question, au tutoiement. */
  intro: z.string(),
});

export type ReponseIA = z.infer<typeof ReponseIASchema>;
