import { z } from "zod";
import type { Fiche } from "../fiches/schema";
import { searchFiches } from "../fiches/search";

// Mesure de la recherche sur eval/questions.jsonl, sans IA : la question brute est donnée telle quelle
// à searchFiches. C'est le chemin de secours de /api/ask ; les chiffres sont donc une borne basse.

export const FAMILLES = ["couverte", "hors_perimetre", "vague"] as const;
export const LANGUES = ["fr", "mixte", "wo"] as const;
export type Langue = (typeof LANGUES)[number];

/**
 * Une ligne de eval/questions.jsonl.
 * - couverte : une fiche répond (attendu_slug obligatoire, doit_contenir : faits pris dans cette fiche) ;
 * - hors_perimetre : refus attendu ; vague : question de précision attendue.
 * - langue : fr (défaut), mixte (français et wolof mêlés) ou wo (wolof).
 */
export const QuestionSchema = z
  .strictObject({
    question: z.string().trim().min(3, "Question trop courte"),
    famille: z.enum(FAMILLES, { error: `Famille inconnue. Valeurs possibles : ${FAMILLES.join(", ")}` }),
    langue: z.enum(LANGUES, { error: `Langue inconnue. Valeurs possibles : ${LANGUES.join(", ")}` }).default("fr"),
    attendu_slug: z.string().min(1).nullable().default(null),
    doit_contenir: z.array(z.string().min(1, "Fait attendu vide")).default([]),
  })
  .superRefine((q, ctx) => {
    if (q.famille === "couverte" && q.attendu_slug === null) {
      ctx.addIssue({ code: "custom", path: ["attendu_slug"], message: "Obligatoire pour une question couverte" });
    }
    if (q.famille !== "couverte" && q.attendu_slug !== null) {
      ctx.addIssue({ code: "custom", path: ["attendu_slug"], message: "Doit être absent hors des questions couvertes" });
    }
    if (q.famille !== "couverte" && q.doit_contenir.length > 0) {
      ctx.addIssue({ code: "custom", path: ["doit_contenir"], message: "Réservé aux questions couvertes" });
    }
  });

export type Question = z.infer<typeof QuestionSchema>;

export type LectureQuestions = { questions: Question[]; erreurs: string[] };

/** Lit le contenu d'un fichier .jsonl. Ne lève pas d'exception : les problèmes sont dans `erreurs`. */
export function parseQuestions(contenu: string): LectureQuestions {
  const questions: Question[] = [];
  const erreurs: string[] = [];

  contenu.split(/\r?\n/).forEach((ligne, index) => {
    if (ligne.trim() === "") return;
    const numero = index + 1;

    let brut: unknown;
    try {
      brut = JSON.parse(ligne);
    } catch {
      erreurs.push(`ligne ${numero} : JSON illisible`);
      return;
    }

    const resultat = QuestionSchema.safeParse(brut);
    if (!resultat.success) {
      for (const issue of resultat.error.issues) {
        const champ = issue.path.length ? issue.path.join(".") : "(ligne)";
        erreurs.push(`ligne ${numero} : ${champ} — ${issue.message}`);
      }
      return;
    }
    questions.push(resultat.data);
  });

  return { questions, erreurs };
}

/** Minuscules, sans accents, espaces simples : pour comparer un fait attendu au texte d'une fiche. */
function simplifier(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function texteDeLaFiche(fiche: Fiche): string {
  return [
    fiche.titre,
    fiche.resume,
    ...fiche.mots_cles,
    ...fiche.pieces,
    ...fiche.etapes,
    fiche.cout ?? "",
    fiche.delai ?? "",
    fiche.lieu ?? "",
    fiche.corps,
  ].join("\n");
}

function abreger(texte: string, max = 60): string {
  return texte.length > max ? `${texte.slice(0, max - 1)}…` : texte;
}

/**
 * Contrôle que le fichier de questions colle aux fiches : la fiche attendue existe et chaque fait
 * attendu y figure (« les faits attendus se prennent dans les fiches, jamais de mémoire »).
 */
export function verifierDonnees(questions: Question[], fiches: Fiche[]): string[] {
  const erreurs: string[] = [];
  for (const q of questions) {
    if (q.attendu_slug === null) continue;
    const attendue = fiches.find((f) => f.slug === q.attendu_slug);
    if (!attendue) {
      erreurs.push(`« ${abreger(q.question)} » : fiche attendue inconnue « ${q.attendu_slug} »`);
      continue;
    }
    const texte = simplifier(texteDeLaFiche(attendue));
    for (const fait of q.doit_contenir) {
      if (!texte.includes(simplifier(fait))) {
        erreurs.push(`« ${abreger(q.question)} » : le fait « ${fait} » ne figure pas dans la fiche « ${attendue.slug} »`);
      }
    }
  }
  return erreurs;
}

export type StatutQuestion = "reussie" | "partielle" | "echouee" | "ignoree";

export type ResultatQuestion = {
  question: Question;
  /** reussie : fiche attendue en 1er (ou refus correct) ; partielle : parmi les résultats mais pas 1re. */
  statut: StatutQuestion;
  /** Pourquoi la question n'a pas été évaluée (statut « ignoree »). */
  raison?: string;
  /** Fiches renvoyées par la recherche, dans l'ordre. */
  trouvees: { slug: string; score: number }[];
  /** Rang de la fiche attendue (1 = première), null si elle n'est pas renvoyée. */
  rang: number | null;
};

export type Synthese = {
  couvertes: { evaluees: number; top1: number; top3: number; ignorees: number };
  refus: { evaluees: number; corrects: number };
  vagues: { ignorees: number };
};

export type Evaluation = {
  resultats: ResultatQuestion[];
  global: Synthese;
  parLangue: Partial<Record<Langue, Synthese>>;
};

export type OptionsEvaluation = {
  /** Inclut les fiches « brouillon », comme DEMARCHE_INCLUDE_DRAFTS=true. */
  inclureBrouillons?: boolean;
  /** Seuil de pertinence (celui de la recherche par défaut). */
  seuil?: number;
};

function evaluerQuestion(
  question: Question,
  fiches: Fiche[],
  { inclureBrouillons = false, seuil }: OptionsEvaluation,
): ResultatQuestion {
  if (question.famille === "vague") {
    return {
      question,
      statut: "ignoree",
      raison: "la question de précision demande l'IA",
      trouvees: [],
      rang: null,
    };
  }

  const renvoyees = () =>
    searchFiches(fiches, question.question, { inclureBrouillons, seuil }).map((r) => ({
      slug: r.fiche.slug,
      score: r.score,
    }));

  if (question.famille === "hors_perimetre") {
    const trouvees = renvoyees();
    return { question, statut: trouvees.length === 0 ? "reussie" : "echouee", trouvees, rang: null };
  }

  const attendue = fiches.find((f) => f.slug === question.attendu_slug);
  if (!attendue) {
    return {
      question,
      statut: "ignoree",
      raison: `fiche attendue inconnue « ${question.attendu_slug} »`,
      trouvees: [],
      rang: null,
    };
  }
  if (attendue.statut !== "verifie" && !inclureBrouillons) {
    return {
      question,
      statut: "ignoree",
      raison: `fiche « ${attendue.slug} » en brouillon (option --brouillons)`,
      trouvees: [],
      rang: null,
    };
  }

  const trouvees = renvoyees();
  const index = trouvees.findIndex((t) => t.slug === attendue.slug);
  const rang = index === -1 ? null : index + 1;
  const statut: StatutQuestion = rang === null ? "echouee" : rang === 1 ? "reussie" : "partielle";
  return { question, statut, trouvees, rang };
}

function synthetiser(resultats: ResultatQuestion[]): Synthese {
  const synthese: Synthese = {
    couvertes: { evaluees: 0, top1: 0, top3: 0, ignorees: 0 },
    refus: { evaluees: 0, corrects: 0 },
    vagues: { ignorees: 0 },
  };
  for (const r of resultats) {
    if (r.question.famille === "vague") {
      synthese.vagues.ignorees += 1;
    } else if (r.question.famille === "hors_perimetre") {
      synthese.refus.evaluees += 1;
      if (r.statut === "reussie") synthese.refus.corrects += 1;
    } else if (r.statut === "ignoree") {
      synthese.couvertes.ignorees += 1;
    } else {
      synthese.couvertes.evaluees += 1;
      if (r.statut === "reussie") synthese.couvertes.top1 += 1;
      if (r.statut !== "echouee") synthese.couvertes.top3 += 1;
    }
  }
  return synthese;
}

/** Passe chaque question dans la recherche et compte : fiche attendue en 1er ou parmi les 3, refus corrects. */
export function evaluerRecherche(
  questions: Question[],
  fiches: Fiche[],
  options: OptionsEvaluation = {},
): Evaluation {
  const resultats = questions.map((q) => evaluerQuestion(q, fiches, options));

  const parLangue: Partial<Record<Langue, Synthese>> = {};
  for (const langue of LANGUES) {
    const deLaLangue = resultats.filter((r) => r.question.langue === langue);
    if (deLaLangue.length > 0) parLangue[langue] = synthetiser(deLaLangue);
  }

  return { resultats, global: synthetiser(resultats), parLangue };
}
