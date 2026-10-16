import { poserQuestion, type Reponse } from "../ai/ask";
import type { Modele } from "../ai/structured";
import type { Fiche } from "../fiches/schema";
import { evaluerBoutEnBout, type ResultatBoutEnBout } from "./bout-en-bout";
import { enregistrerAppels } from "./enregistreur";
import { parcourirAvecPause } from "./parcours";
import { jugerPiege, type JugementPiege, type QuestionPiege, type TypePiege } from "./pieges";
import { jugerFidelite, type JugementFidelite, type QuestionFidelite, type StatutFidelite } from "./questions-fidelite";
import { resumerRepetitions, type ResumeRepetition } from "./repetition";
import type { Question } from "./retrieval";

// Les tests de fiabilité (`npm run fiabilite`) : le plan (quelles questions, combien d'appels IA) et l'exécution avec un
// modèle. Le script `scripts/fiabilite.ts` ne fait que lire les options et afficher ; tout ce qui se teste est ici, avec un
// faux modèle. Ce module n'écrit nulle part : ni base de données, ni journal, ni cache (voir sans-neon.test.ts).

export const BLOCS = ["fidelite", "refus", "pieges", "saisie", "repetition"] as const;
export type Bloc = (typeof BLOCS)[number];

/** Les jeux de questions déjà lus et validés. */
export type Jeux = {
  fidelite: QuestionFidelite[];
  refus: Question[];
  pieges: QuestionPiege[];
  saisie: Question[];
};

/** Une question posée plusieurs fois pour voir si le site répond toujours pareil. `origine` : le jeu dont elle vient. */
export type QuestionRepetee = { question: string; origine: "saisie" | "refus" | "pieges" };

export type Plan = {
  fidelite: QuestionFidelite[];
  refus: Question[];
  pieges: QuestionPiege[];
  saisie: Question[];
  repetition: QuestionRepetee[];
  /** Combien de fois chaque question de `repetition` est posée. */
  repetitions: number;
};

/** Taille de l'échantillon : de quoi voir si quelque chose cloche en une centaine d'appels, avant de lancer les jeux complets. */
const ECHANTILLON = { refus: 10, pieges: 10, saisie: 10 };
/** Questions répétées par jeu (saisie, refus, pièges) : une dans l'échantillon, deux dans la mesure complète. */
const REPETEES_PAR_JEU = { echantillon: 1, complet: 2 };

/** `n` éléments répartis sur toute la liste (au milieu de `n` tranches égales), toujours les mêmes. */
function espacer<T>(items: readonly T[], n: number): T[] {
  if (n >= items.length) return [...items];
  return Array.from({ length: n }, (_, k) => items[Math.floor(((2 * k + 1) * items.length) / (2 * n))]);
}

/** `n` éléments en prenant un par groupe à tour de rôle (groupes dans l'ordre où ils apparaissent) : chaque groupe est vu. */
function parGroupes<T>(items: readonly T[], n: number, groupe: (item: T) => string): T[] {
  const groupes = new Map<string, T[]>();
  for (const item of items) groupes.set(groupe(item), [...(groupes.get(groupe(item)) ?? []), item]);
  const choisis: T[] = [];
  for (let tour = 0; choisis.length < n && tour < items.length; tour += 1) {
    for (const membres of groupes.values()) {
      if (choisis.length < n && tour < membres.length) choisis.push(membres[tour]);
    }
  }
  return choisis;
}

/**
 * Fidélité : tous les cas « ne sait pas » (les plus risqués : un champ vide qu'on pourrait deviner), plus un champ avec une
 * valeur par fiche, en changeant de champ d'une fiche à l'autre. Les questions restent dans l'ordre des fiches.
 */
function echantillonFidelite(questions: QuestionFidelite[]): QuestionFidelite[] {
  const choisies = new Set(questions.filter((q) => q.attendu === "ne_sait_pas"));
  const parFiche = new Map<string, QuestionFidelite[]>();
  for (const q of questions) parFiche.set(q.fiche_slug, [...(parFiche.get(q.fiche_slug) ?? []), q]);
  [...parFiche.values()].forEach((deLaFiche, rang) => {
    const avecValeur = deLaFiche.filter((q) => q.attendu === "valeur");
    if (avecValeur.length > 0) choisies.add(avecValeur[rang % avecValeur.length]);
  });
  return questions.filter((q) => choisies.has(q));
}

export type OptionsPlan = {
  /** Les blocs à mesurer (tous par défaut) : les autres restent vides. */
  blocs?: readonly Bloc[];
  /** Une sélection d'environ 90 appels au lieu de la mesure complète. */
  echantillon?: boolean;
  repetitions?: number;
};

/** Choisit les questions à poser. Déterministe : deux plans avec les mêmes jeux et les mêmes options sont identiques. */
export function construirePlan(jeux: Jeux, { blocs = BLOCS, echantillon = false, repetitions = 3 }: OptionsPlan = {}): Plan {
  const veut = (bloc: Bloc) => blocs.includes(bloc);
  const parJeu = echantillon ? REPETEES_PAR_JEU.echantillon : REPETEES_PAR_JEU.complet;
  const repetees = (origine: QuestionRepetee["origine"], questions: { question: string }[]): QuestionRepetee[] =>
    espacer(questions, parJeu).map((q) => ({ question: q.question, origine }));

  return {
    fidelite: !veut("fidelite") ? [] : echantillon ? echantillonFidelite(jeux.fidelite) : jeux.fidelite,
    refus: !veut("refus") ? [] : echantillon ? espacer(jeux.refus, ECHANTILLON.refus) : jeux.refus,
    pieges: !veut("pieges") ? [] : echantillon ? parGroupes(jeux.pieges, ECHANTILLON.pieges, (q) => q.piege) : jeux.pieges,
    saisie: !veut("saisie") ? [] : echantillon ? espacer(jeux.saisie, ECHANTILLON.saisie) : jeux.saisie,
    repetition: !veut("repetition")
      ? []
      : [...repetees("saisie", jeux.saisie), ...repetees("refus", jeux.refus), ...repetees("pieges", jeux.pieges)],
    repetitions,
  };
}

/**
 * Appels au modèle par question posée (estimation). La fidélité saute l'étape « comprendre » : un seul appel. Un refus en
 * coûte un le plus souvent (« comprendre » suffit). Les autres comprennent puis répondent : deux. Une introduction refusée
 * par les garde-fous donne une seconde chance au modèle : un appel de plus, que cette estimation ne compte pas.
 */
export const APPELS_PAR_QUESTION: Record<Bloc, number> = { fidelite: 1, refus: 1, pieges: 2, saisie: 2, repetition: 2 };

export type Volume = { questions: number; appels: number };

/** Combien de questions seront posées et combien d'appels au modèle cela coûte (estimation, voir `APPELS_PAR_QUESTION`). */
export function compterAppels(plan: Plan): { parBloc: Record<Bloc, Volume>; total: Volume } {
  const volume = (bloc: Bloc, questions: number): Volume => ({ questions, appels: questions * APPELS_PAR_QUESTION[bloc] });
  const parBloc: Record<Bloc, Volume> = {
    fidelite: volume("fidelite", plan.fidelite.length),
    refus: volume("refus", plan.refus.length),
    pieges: volume("pieges", plan.pieges.length),
    saisie: volume("saisie", plan.saisie.length),
    repetition: volume("repetition", plan.repetition.length * plan.repetitions),
  };
  const total = Object.values(parBloc).reduce(
    (somme, v) => ({ questions: somme.questions + v.questions, appels: somme.appels + v.appels }),
    { questions: 0, appels: 0 },
  );
  return { parBloc, total };
}

// --- Les résultats ------------------------------------------------------------------------------------------------

export type ResultatFidelite = {
  question: QuestionFidelite;
  jugement: JugementFidelite;
  /** L'introduction montrée (après les garde-fous) et celle que le modèle avait écrite (avant). `null` : aucune. */
  intro: string | null;
  introBrute: string | null;
  /** L'IA a échoué au moins une fois : la mesure ne dit rien sur le modèle, à refaire. */
  degrade: boolean;
};

export type ResultatPiege = {
  question: QuestionPiege;
  jugement: JugementPiege;
  /** Ce que le site a montré, en quelques mots. */
  obtenu: string;
  degrade: boolean;
};

export type ResultatRepetition = ResumeRepetition & {
  origine: QuestionRepetee["origine"];
  essais: number;
  /** Combien d'essais ont vu l'IA échouer. */
  degrades: number;
};

export type Resultats = {
  fidelite: ResultatFidelite[];
  refus: ResultatBoutEnBout[];
  pieges: ResultatPiege[];
  saisie: ResultatBoutEnBout[];
  repetition: ResultatRepetition[];
};

/** Ce que le site a montré, en quelques mots. */
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
    case "salutation":
      return "salutation";
  }
}

export type OptionsMesure = {
  /** Les fiches que le site montre : vérifiées, mises en forme comme à l'écran (`fichePourAffichage`). */
  fiches: Fiche[];
  modele: Modele;
  /** Attente entre deux questions, pour ménager le quota gratuit du modèle. */
  pauseMs?: number;
  dormir?: (ms: number) => Promise<void>;
  /** Une ligne par question posée, dès qu'elle est jugée. */
  surProgression?: (bloc: Bloc, ligne: string) => void;
};

const dormirVraiment = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MARQUES_BOUT_EN_BOUT = { reussie: "✓", partielle: "~", echouee: "✗" } as const;
const MARQUES_FIDELITE: Record<StatutFidelite, string> = {
  fidele: "✓",
  corrige_par_garde_fous: "~",
  invente: "✗",
  devine: "✗",
  sans_intro: "–",
  refus: "–",
};

export const LIBELLES_FIDELITE: Record<StatutFidelite, string> = {
  invente: "inventé",
  devine: "deviné",
  corrige_par_garde_fous: "corrigé par les garde-fous",
  fidele: "fidèle",
  sans_intro: "sans introduction",
  refus: "refus (pas de fiche)",
};

/** Dans l'ordre où on veut les lire : les deux échecs critiques d'abord. */
export const STATUTS_FIDELITE: readonly StatutFidelite[] = ["invente", "devine", "corrige_par_garde_fous", "fidele", "sans_intro", "refus"];

const REPLI = " (IA en échec : mesure à refaire)";
const compteur = (index: number, total: number) => `[${String(index + 1).padStart(String(total).length)}/${total}]`;

/**
 * Passe les questions du plan dans le vrai parcours du site (`poserQuestion`), une par une, avec une pause entre deux. Rien
 * n'est écrit nulle part : ni journal, ni cache, ni base (le script ne charge jamais le service du site). La fidélité pose
 * la question sur la fiche voulue (l'étape « comprendre » est sautée) pour ne mesurer que ce que le modèle écrit.
 */
export async function mesurerFiabilite(
  plan: Plan,
  { fiches, modele, pauseMs = 0, dormir = dormirVraiment, surProgression }: OptionsMesure,
): Promise<Resultats> {
  /** Pose une question comme le site, et dit combien de fois l'IA a échoué en chemin. */
  const poser = async (question: string, modeleUtilise: Modele, ficheSlug?: string) => {
    let echecsIA = 0;
    const reponse = await poserQuestion(question, {
      fiches,
      modele: modeleUtilise,
      ficheSlug,
      signaler: () => {
        echecsIA += 1;
      },
    });
    return { reponse, echecsIA };
  };

  // Une pause aussi entre deux blocs : le plafond par minute du fournisseur ne connaît pas nos blocs.
  let dejaPose = false;
  const avant = async (bloc: Bloc) => {
    const aPoser = bloc === "repetition" ? plan.repetition.length : plan[bloc].length;
    if (aPoser === 0) return;
    if (dejaPose && pauseMs > 0) await dormir(pauseMs);
    dejaPose = true;
  };
  const options = <R>(bloc: Bloc, ligne: (resultat: R, index: number) => string) => ({
    pauseMs,
    dormir,
    surResultat: (resultat: R, index: number) => surProgression?.(bloc, ligne(resultat, index)),
  });

  // Fidélité
  await avant("fidelite");
  const enregistreur = enregistrerAppels(modele);
  const fidelite = await parcourirAvecPause(
    plan.fidelite,
    async (question): Promise<ResultatFidelite> => {
      enregistreur.vider();
      const { reponse, echecsIA } = await poser(question.question, enregistreur.modele, question.fiche_slug);
      const introBrute = enregistreur.introBrute();
      return {
        question,
        jugement: jugerFidelite(question, { reponse, introBrute }),
        intro: reponse.type === "fiche" ? reponse.intro : null,
        introBrute,
        degrade: echecsIA > 0,
      };
    },
    options<ResultatFidelite>("fidelite", (r, index) => {
      const { statut, absentsFinal } = r.jugement;
      const absents = absentsFinal.length > 0 ? ` : ${absentsFinal.map((e) => e.texte).join(", ")}` : "";
      return `${compteur(index, plan.fidelite.length)} ${MARQUES_FIDELITE[statut]} ${LIBELLES_FIDELITE[statut]}${absents} — ${r.question.champ} — « ${r.question.question} »${r.degrade ? REPLI : ""}`;
    }),
  );

  // Refus et saisie : la mesure de bout en bout qui existe déjà.
  const boutEnBout = (bloc: "refus" | "saisie") =>
    evaluerBoutEnBout(plan[bloc], (question) => poser(question.question, modele), {
      ...options<ResultatBoutEnBout>(bloc, (r, index) => {
        const refus = r.rejet === null ? "" : ` (introduction refusée : ${r.rejet})`;
        return `${compteur(index, plan[bloc].length)} ${MARQUES_BOUT_EN_BOUT[r.statut]} « ${r.question.question} » → ${r.obtenu}${r.degrade ? REPLI : ""}${refus}`;
      }),
    });
  await avant("refus");
  const refus = await boutEnBout("refus");

  // Pièges
  await avant("pieges");
  const pieges = await parcourirAvecPause(
    plan.pieges,
    async (question): Promise<ResultatPiege> => {
      const { reponse, echecsIA } = await poser(question.question, modele);
      return { question, jugement: jugerPiege(question, reponse), obtenu: decrire(reponse), degrade: echecsIA > 0 };
    },
    options<ResultatPiege>("pieges", (r, index) => {
      const raison = r.jugement.raison === null ? "" : ` — ${r.jugement.raison}`;
      return `${compteur(index, plan.pieges.length)} ${r.jugement.statut === "reussie" ? "✓" : "✗"} ${r.question.piege} — « ${r.question.question} » → ${r.obtenu}${raison}${r.degrade ? REPLI : ""}`;
    }),
  );

  await avant("saisie");
  const saisie = await boutEnBout("saisie");

  // Répétition : chaque question est posée `repetitions` fois, sans cache, puis regroupée question par question.
  await avant("repetition");
  const essais = plan.repetition.flatMap((q) => Array.from({ length: plan.repetitions }, () => q));
  const reponses = await parcourirAvecPause(essais, (q) => poser(q.question, modele), {
    pauseMs,
    dormir,
    surResultat: ({ reponse, echecsIA }, index) =>
      surProgression?.(
        "repetition",
        `${compteur(index, essais.length)} « ${essais[index].question} » → ${decrire(reponse)}${echecsIA > 0 ? REPLI : ""}`,
      ),
  });
  const repetition = plan.repetition.map((q, rang): ResultatRepetition => {
    const deLaQuestion = reponses.slice(rang * plan.repetitions, (rang + 1) * plan.repetitions);
    const [resume] = resumerRepetitions([{ question: q.question, reponses: deLaQuestion.map((r) => r.reponse) }]);
    return {
      ...resume,
      origine: q.origine,
      essais: deLaQuestion.length,
      degrades: deLaQuestion.filter((r) => r.echecsIA > 0).length,
    };
  });

  return { fidelite, refus, pieges, saisie, repetition };
}

// --- Les chiffres -------------------------------------------------------------------------------------------------

export type ResumeFidelite = {
  total: number;
  statuts: Record<StatutFidelite, number>;
  /** Réponses qui montrent la fiche de la question. */
  bonneFiche: number;
  /** Les questions dont le champ de la fiche est vide : combien, et combien ont reçu une valeur inventée (`devine`). */
  neSaitPas: { total: number; devines: number };
  degrades: number;
};

export function resumerFidelite(resultats: ResultatFidelite[]): ResumeFidelite {
  const resume: ResumeFidelite = {
    total: resultats.length,
    statuts: { invente: 0, devine: 0, corrige_par_garde_fous: 0, fidele: 0, sans_intro: 0, refus: 0 },
    bonneFiche: 0,
    neSaitPas: { total: 0, devines: 0 },
    degrades: 0,
  };
  for (const { question, jugement, degrade } of resultats) {
    resume.statuts[jugement.statut] += 1;
    if (jugement.bonneFiche) resume.bonneFiche += 1;
    if (question.attendu === "ne_sait_pas") {
      resume.neSaitPas.total += 1;
      if (jugement.statut === "devine") resume.neSaitPas.devines += 1;
    }
    if (degrade) resume.degrades += 1;
  }
  return resume;
}

export type ResumePieges = {
  total: number;
  reussies: number;
  parType: Record<TypePiege, { total: number; reussies: number }>;
  degrades: number;
};

export function resumerPieges(resultats: ResultatPiege[]): ResumePieges {
  const compte = () => ({ total: 0, reussies: 0 });
  const resume: ResumePieges = {
    total: resultats.length,
    reussies: 0,
    parType: {
      injection: compte(),
      oubli_instructions: compte(),
      prompt_systeme: compte(),
      conseil_juridique: compte(),
      info_absente: compte(),
      melange: compte(),
    },
    degrades: 0,
  };
  for (const { question, jugement, degrade } of resultats) {
    resume.parType[question.piege].total += 1;
    if (jugement.statut === "reussie") {
      resume.reussies += 1;
      resume.parType[question.piege].reussies += 1;
    }
    if (degrade) resume.degrades += 1;
  }
  return resume;
}
