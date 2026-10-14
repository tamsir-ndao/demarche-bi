import type { Reponse } from "../ai/ask";
import { LANGUES, type Langue, type Question } from "./retrieval";

// Mesure de bout en bout sur eval/questions.jsonl, avec l'IA : chaque question suit le parcours du site (comprendre,
// décider, répondre, vérifier). Les chiffres dépendent du modèle et varient d'un jour à l'autre : à relire, pas à figer.

export type StatutBoutEnBout = "reussie" | "partielle" | "echouee";

export type Jugement = { statut: StatutBoutEnBout; obtenu: string };

/** Ce que le site a montré, en une ligne. */
function decrire(reponse: Reponse): string {
  switch (reponse.type) {
    case "fiche":
      return `fiche : ${reponse.fiche.slug}`;
    case "precision":
      return `précision : ${reponse.options.map((option) => option.slug).join(", ")}`;
    case "precision_generale":
      return "précision générale";
    case "inconnue":
      return "je ne sais pas";
    case "hors_domaine":
      return "hors domaine";
    case "interdit":
      return "interdit par la loi";
  }
}

function statutDe(question: Question, reponse: Reponse): StatutBoutEnBout {
  switch (question.famille) {
    case "couverte":
      if (reponse.type === "fiche") return reponse.fiche.slug === question.attendu_slug ? "reussie" : "echouee";
      // L'écran de précision qui propose la bonne démarche aide la personne, sans répondre à sa place.
      if (reponse.type === "precision") {
        return reponse.options.some((option) => option.slug === question.attendu_slug) ? "partielle" : "echouee";
      }
      return "echouee";
    case "hors_perimetre":
      // Qu'une démarche manque ou que le sujet n'ait aucun rapport avec l'administration, le site n'invente rien.
      return reponse.type === "inconnue" || reponse.type === "hors_domaine" || reponse.type === "interdit" ? "reussie" : "echouee";
    case "vague":
      if (reponse.type === "precision" || reponse.type === "precision_generale") return "reussie";
      // « Je ne sais pas » n'invente rien, mais n'aide pas ; deviner une démarche est le vrai échec.
      return reponse.type === "inconnue" || reponse.type === "hors_domaine" ? "partielle" : "echouee";
  }
}

/** Compare la réponse du site à ce que la question attendait. */
export function jugerReponse(question: Question, reponse: Reponse): Jugement {
  return { statut: statutDe(question, reponse), obtenu: decrire(reponse) };
}

export type ResultatBoutEnBout = Jugement & {
  question: Question;
  /**
   * Pour une réponse avec fiche : l'introduction de l'IA est montrée, refusée par les garde-fous, ou absente
   * (IA saturée, en panne ou non configurée). `null` quand la réponse n'est pas une fiche.
   */
  introduction: "montree" | "refusee" | "absente" | null;
  /** La raison du refus des garde-fous quand l'introduction est refusée, sinon `null`. */
  rejet: string | null;
  /** L'IA a échoué au moins une fois pour cette question : le résultat montre alors le repli, pas l'IA. */
  degrade: boolean;
};

/** Pose une question comme le fait le site, et dit combien de fois l'IA a échoué en chemin. */
export type PoserQuestion = (question: Question) => Promise<{ reponse: Reponse; echecsIA: number }>;

export type OptionsBoutEnBout = {
  /** Attente entre deux questions, pour ménager le quota gratuit du modèle. */
  pauseMs?: number;
  dormir?: (ms: number) => Promise<void>;
  /** Appelé dès qu'une question est jugée (pour afficher l'avancement). */
  surResultat?: (resultat: ResultatBoutEnBout, index: number) => void;
};

function etatIntroduction(reponse: Reponse): ResultatBoutEnBout["introduction"] {
  if (reponse.type !== "fiche") return null;
  if (reponse.intro !== null) return "montree";
  return reponse.rejet !== null ? "refusee" : "absente";
}

const dormirVraiment = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Passe les questions une par une dans `poser`, avec une pause entre deux. */
export async function evaluerBoutEnBout(
  questions: Question[],
  poser: PoserQuestion,
  { pauseMs = 0, dormir = dormirVraiment, surResultat }: OptionsBoutEnBout = {},
): Promise<ResultatBoutEnBout[]> {
  const resultats: ResultatBoutEnBout[] = [];
  for (const [index, question] of questions.entries()) {
    if (index > 0 && pauseMs > 0) await dormir(pauseMs);
    const { reponse, echecsIA } = await poser(question);
    const resultat: ResultatBoutEnBout = {
      question,
      ...jugerReponse(question, reponse),
      introduction: etatIntroduction(reponse),
      rejet: reponse.type === "fiche" ? reponse.rejet : null,
      degrade: echecsIA > 0,
    };
    resultats.push(resultat);
    surResultat?.(resultat, index);
  }
  return resultats;
}

type Compte = { total: number; reussies: number; partielles: number; echouees: number };

export type SyntheseBoutEnBout = {
  couvertes: Compte;
  horsPerimetre: Compte;
  vagues: Compte;
  introductions: { montrees: number; refusees: number; absentes: number };
  /** Questions où l'IA a échoué au moins une fois : leur résultat est celui du repli. */
  degrades: number;
};

function synthetiser(resultats: ResultatBoutEnBout[]): SyntheseBoutEnBout {
  const compte = (): Compte => ({ total: 0, reussies: 0, partielles: 0, echouees: 0 });
  const synthese: SyntheseBoutEnBout = {
    couvertes: compte(),
    horsPerimetre: compte(),
    vagues: compte(),
    introductions: { montrees: 0, refusees: 0, absentes: 0 },
    degrades: 0,
  };

  for (const resultat of resultats) {
    const famille = { couverte: synthese.couvertes, hors_perimetre: synthese.horsPerimetre, vague: synthese.vagues }[
      resultat.question.famille
    ];
    famille.total += 1;
    if (resultat.statut === "reussie") famille.reussies += 1;
    else if (resultat.statut === "partielle") famille.partielles += 1;
    else famille.echouees += 1;

    if (resultat.introduction === "montree") synthese.introductions.montrees += 1;
    else if (resultat.introduction === "refusee") synthese.introductions.refusees += 1;
    else if (resultat.introduction === "absente") synthese.introductions.absentes += 1;
    if (resultat.degrade) synthese.degrades += 1;
  }
  return synthese;
}

export type ResumeBoutEnBout = {
  global: SyntheseBoutEnBout;
  parLangue: Partial<Record<Langue, SyntheseBoutEnBout>>;
};

/** Les chiffres de l'ensemble des questions, puis langue par langue. */
export function resumerBoutEnBout(resultats: ResultatBoutEnBout[]): ResumeBoutEnBout {
  const parLangue: ResumeBoutEnBout["parLangue"] = {};
  for (const langue of LANGUES) {
    const deLaLangue = resultats.filter((resultat) => resultat.question.langue === langue);
    if (deLaLangue.length > 0) parLangue[langue] = synthetiser(deLaLangue);
  }
  return { global: synthetiser(resultats), parLangue };
}
