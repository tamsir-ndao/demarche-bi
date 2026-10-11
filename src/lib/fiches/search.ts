import type { Fiche } from "./schema";

// Recherche lexicale (étape 2 de /api/ask) : pas d'IA, pas d'embeddings, testable sans clé.
// Score de type BM25 où chaque champ de la fiche compte plus ou moins (voir POIDS).

/**
 * Score minimal pour qu'une fiche soit jugée pertinente ; en dessous, la réponse est « je ne sais pas ».
 * VALEUR PROVISOIRE : à calibrer sur les vraies fiches (tâche « Vérifier le seuil de pertinence »).
 */
export const SEUIL_PERTINENCE = 1;

/** Nombre maximal de fiches renvoyées par défaut. */
export const LIMITE_PAR_DEFAUT = 3;

/** Poids de chaque champ : un mot dans le titre ou les mots-clés compte plus que dans le corps. */
const POIDS = { titre: 4, mots_cles: 4, resume: 2, etapes: 1, pieces: 1, corps: 1 } as const;

// Paramètres BM25 classiques.
const K1 = 1.2;
const B = 0.75;

// Écrits sans accents : la comparaison se fait après normalisation.
const MOTS_VIDES = new Set(
  (
    "le la les un une des du de au aux et ou ou en dans sur sous par pour avec sans " +
    "ce cet cette ces ca que qui quoi quel quelle quels quelles si ne pas " +
    "je tu il elle on nous vous ils elles me te se lui mon ma mes ton ta tes son sa ses " +
    "notre nos votre vos leur leurs est sont suis es etre ai as avons avez ont a " +
    "comment combien quand pourquoi " +
    "veux voudrais souhaite besoin peux puis dois faut"
  ).split(" "),
);

function singulier(mot: string): string {
  return mot.length > 3 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

/** Découpe un texte en mots comparables : minuscules, sans accents, sans mots vides, au singulier. */
export function normaliser(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/œ/g, "oe")
    .split(/[^a-z0-9]+/)
    .filter((mot) => mot.length >= 2 && !MOTS_VIDES.has(mot))
    .map(singulier);
}

type FicheIndexee = {
  fiche: Fiche;
  /** Fréquence pondérée de chaque mot dans la fiche. */
  frequences: Map<string, number>;
  /** Longueur pondérée de la fiche (somme des mots × poids de leur champ). */
  longueur: number;
};

function indexer(fiche: Fiche): FicheIndexee {
  const champs: [string, number][] = [
    [fiche.titre, POIDS.titre],
    [fiche.mots_cles.join(" "), POIDS.mots_cles],
    [fiche.resume, POIDS.resume],
    [fiche.etapes.join(" "), POIDS.etapes],
    [fiche.pieces.join(" "), POIDS.pieces],
    [fiche.corps, POIDS.corps],
  ];

  const frequences = new Map<string, number>();
  let longueur = 0;
  for (const [texte, poids] of champs) {
    for (const mot of normaliser(texte)) {
      frequences.set(mot, (frequences.get(mot) ?? 0) + poids);
      longueur += poids;
    }
  }
  return { fiche, frequences, longueur };
}

export type ResultatRecherche = { fiche: Fiche; score: number };

export type OptionsRecherche = {
  /** Nombre maximal de fiches renvoyées (3 par défaut). */
  limite?: number;
  /** Score minimal pour garder une fiche (SEUIL_PERTINENCE par défaut). */
  seuil?: number;
  /** Inclut les fiches au statut « brouillon » (développement uniquement). */
  inclureBrouillons?: boolean;
};

/**
 * Renvoie les fiches les plus pertinentes pour une question, triées par score décroissant.
 * Une liste vide signifie « aucune fiche pertinente » : l'appelant répond « je ne sais pas ».
 */
export function searchFiches(
  fiches: Fiche[],
  question: string,
  options: OptionsRecherche = {},
): ResultatRecherche[] {
  const { limite = LIMITE_PAR_DEFAUT, seuil = SEUIL_PERTINENCE, inclureBrouillons = false } = options;

  const mots = [...new Set(normaliser(question))];
  if (mots.length === 0) return [];

  const candidates = fiches
    .filter((fiche) => inclureBrouillons || fiche.statut === "verifie")
    .map(indexer);
  if (candidates.length === 0) return [];

  const longueurMoyenne = candidates.reduce((somme, c) => somme + c.longueur, 0) / candidates.length;

  const scores = new Map<FicheIndexee, number>();
  for (const mot of mots) {
    const contenant = candidates.filter((c) => c.frequences.has(mot));
    if (contenant.length === 0) continue;

    const idf = Math.log(1 + (candidates.length - contenant.length + 0.5) / (contenant.length + 0.5));
    for (const c of contenant) {
      const f = c.frequences.get(mot) ?? 0;
      const normeLongueur = 1 - B + (B * c.longueur) / longueurMoyenne;
      const partiel = (idf * f * (K1 + 1)) / (f + K1 * normeLongueur);
      scores.set(c, (scores.get(c) ?? 0) + partiel);
    }
  }

  return [...scores]
    .filter(([, score]) => score > 0 && score >= seuil)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([c, score]) => ({ fiche: c.fiche, score }));
}
