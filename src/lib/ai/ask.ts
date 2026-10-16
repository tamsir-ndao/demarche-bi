import type { Fiche } from "../fiches/schema";
import { searchFiches } from "../fiches/search";
import { repondre } from "./answer";
import { ErreurIA } from "./client";
import { decider } from "./decide";
import { estDemandeFrauduleuse, estSalutationSeule, verifierIntro } from "./guardrails";
import type { Comprehension } from "./schemas";
import type { Modele } from "./structured";
import { comprendre } from "./understand";

// Le parcours d'une question, de bout en bout :
//   1. Comprendre : le modèle choisit, dans la liste des démarches, celles qui répondent à la question ;
//   2. Décider    : le code répond, demande une précision ou dit « je ne sais pas » ;
//   3. Répondre   : le modèle écrit l'introduction qui répond à la question, à partir de la seule fiche choisie ;
//   4. Vérifier   : le code compare cette introduction à la fiche (garde-fous) ;
//   5. Citer      : l'interface affiche les pièces, les étapes, les chiffres et les sources de la fiche, jamais du modèle.
// Si l'IA ne répond pas ou si la vérification échoue, la fiche est montrée sans introduction.

/** Pourquoi l'introduction manque : l'IA est trop sollicitée ou en panne (sinon `null`, y compris sans IA configurée). */
export type Degrade = "saturee" | "indisponible" | null;

export type Reponse =
  /** `intro` est l'introduction vérifiée, ou `null` : la fiche est alors montrée sans (`rejet` dit pourquoi si la vérification l'a refusée). */
  | { type: "fiche"; fiche: Fiche; autres: Fiche[]; intro: string | null; degrade: Degrade; rejet: string | null }
  | { type: "precision"; options: Fiche[]; question: string }
  | { type: "precision_generale"; question: string }
  /** Une démarche que le site n'a pas. `message` : une phrase du modèle qui reprend le sujet, vérifiée par les garde-fous. */
  | { type: "inconnue"; message?: string }
  /** Aucun rapport avec les démarches administratives. `message` : comme ci-dessus. */
  | { type: "hors_domaine"; message?: string }
  /** Pratique frauduleuse, corrompue ou illégale : refus poli et ferme conforme à la loi. */
  | { type: "interdit"; message?: string }
  /** Salutation ou formule de politesse seule : réponse chaleureuse et invitation à poser sa question. */
  | { type: "salutation"; message?: string };

export type OptionsQuestion = {
  /** Les fiches que le site peut montrer (vérifiées, ou brouillons en développement). */
  fiches: Fiche[];
  /** Le modèle, ou `null` quand l'IA n'est pas configurée : la recherche par mots remplace alors la compréhension. */
  modele: Modele | null;
  /** Démarche choisie sur l'écran de précision : la compréhension est sautée. */
  ficheSlug?: string;
  /** Appelé quand l'IA échoue, pour garder une trace (sans clé ni question). */
  signaler?: (etape: "comprendre" | "repondre", erreur: unknown) => void;
};

const MAX_FICHES_VOISINES = 2;

function degradation(erreur: unknown): Degrade {
  if (!(erreur instanceof ErreurIA)) return "indisponible";
  return erreur.nature === "non_configuree" ? null : erreur.nature;
}

/** Les fiches proches de la question, à proposer en « voir aussi » (recherche par mots, sans IA). */
function fichesVoisines(question: string, fiches: Fiche[], sauf: Fiche): Fiche[] {
  return searchFiches(
    fiches.filter((fiche) => fiche.slug !== sauf.slug),
    question,
    { limite: MAX_FICHES_VOISINES, inclureBrouillons: true },
  ).map((resultat) => resultat.fiche);
}

/** Sans IA : la meilleure fiche trouvée par la recherche par mots, ou « je ne sais pas ». */
function repliParMots(question: string, fiches: Fiche[], degrade: Degrade): Reponse {
  if (estDemandeFrauduleuse(question)) {
    return {
      type: "interdit",
      message: "Cette démarche est interdite par la loi. Je ne peux pas t’aider pour une pratique frauduleuse ou illégale.",
    };
  }
  const [meilleur, ...voisines] = searchFiches(fiches, question, { inclureBrouillons: true });
  if (!meilleur) return { type: "inconnue" };
  return {
    type: "fiche",
    fiche: meilleur.fiche,
    autres: voisines.map((resultat) => resultat.fiche),
    intro: null,
    degrade,
    rejet: null,
  };
}

async function repondreAvecLaFiche(
  question: string,
  comprise: Comprehension | null,
  fiche: Fiche,
  fiches: Fiche[],
  modele: Modele,
  signaler: OptionsQuestion["signaler"],
): Promise<Reponse> {
  const autres = fichesVoisines(question, fiches, fiche);
  const slugs = fiches.map((f) => f.slug);
  try {
    let brute = await repondre(question, comprise?.question_claire ?? "", fiche, modele);
    if (!brute.trouve) return { type: "inconnue" };

    let verdict = verifierIntro(brute.intro, fiche, { slugs });
    if (!verdict.ok) {
      // Une seconde chance, en disant au modèle ce que le contrôle lui reproche.
      brute = await repondre(question, comprise?.question_claire ?? "", fiche, modele, verdict.raison);
      verdict = brute.trouve ? verifierIntro(brute.intro, fiche, { slugs }) : verdict;
    }
    if (!verdict.ok) return { type: "fiche", fiche, autres, intro: null, degrade: null, rejet: verdict.raison };
    return { type: "fiche", fiche, autres, intro: verdict.intro, degrade: null, rejet: null };
  } catch (erreur) {
    signaler?.("repondre", erreur);
    return { type: "fiche", fiche, autres, intro: null, degrade: degradation(erreur), rejet: null };
  }
}

/** Répond à une question de l'utilisateur à partir des seules `fiches`. Ne lève jamais d'erreur à cause de l'IA. */
export async function poserQuestion(question: string, options: OptionsQuestion): Promise<Reponse> {
  if (estDemandeFrauduleuse(question)) {
    return {
      type: "interdit",
      message: "Cette démarche est interdite par la loi. Je ne peux pas t’aider pour une pratique frauduleuse ou illégale.",
    };
  }
  // Un simple « bonjour » n'est pas une question : on salue en retour, sans appeler le modèle ni chercher de fiche.
  // L'écran et la voix disent d'abord « Salam aleykoum ! » : le message ne contient que l'invitation.
  if (estSalutationSeule(question)) {
    return {
      type: "salutation",
      message: "Comment puis-je t’aider aujourd’hui ? Pose-moi ta question sur tes démarches administratives au Sénégal.",
    };
  }
  const { fiches, modele, signaler } = options;
  if (fiches.length === 0) return { type: "inconnue" };
  if (modele === null) return repliParMots(question, fiches, null);

  const choisie = options.ficheSlug ? fiches.find((fiche) => fiche.slug === options.ficheSlug) : undefined;
  if (choisie) return repondreAvecLaFiche(question, null, choisie, fiches, modele, signaler);

  let comprise: Comprehension;
  try {
    comprise = await comprendre(question, fiches, modele);
  } catch (erreur) {
    signaler?.("comprendre", erreur);
    return repliParMots(question, fiches, degradation(erreur));
  }

  const decision = decider(comprise, fiches);
  if (decision.type === "fiche") return repondreAvecLaFiche(question, comprise, decision.fiche, fiches, modele, signaler);
  return decision;
}
