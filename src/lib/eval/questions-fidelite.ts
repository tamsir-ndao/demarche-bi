import type { Reponse } from "../ai/ask";
import type { Fiche } from "../fiches/schema";
import { simplifier } from "../texte";
import { controlerFidelite, ditNePasSavoir, extraireElements, type Element } from "./fidelite";

// Questions générées à partir des fiches (une par fiche et par champ), pour mesurer si l'IA reste fidèle : elle ne doit
// ni inventer un chiffre ni deviner un champ que la fiche laisse vide (`null`). Aucune question n'est écrite à la main :
// le titre de la fiche suffit, donc le jeu suit les fiches quand elles changent.

export const CHAMPS = ["cout", "delai", "lieu", "pieces"] as const;
export type Champ = (typeof CHAMPS)[number];

export type QuestionFidelite = {
  question: string;
  champ: Champ;
  fiche_slug: string;
  /** Ce que la fiche dit de ce champ : `null` quand elle ne le dit pas (champ vide ou liste de pièces vide). */
  valeur: string | string[] | null;
  /** « valeur » : la réponse doit pouvoir donner la valeur ; « ne_sait_pas » : elle doit dire que la fiche ne la précise pas. */
  attendu: "valeur" | "ne_sait_pas";
};

/** Deux formulations par champ, en français simple : la seconde sert à vérifier que le résultat ne tient pas à un tour de phrase. */
const FORMULATIONS: Record<Champ, [(titre: string) => string, (titre: string) => string]> = {
  cout: [(titre) => `Combien coûte « ${titre} » ?`, (titre) => `Quel est le prix pour « ${titre} » ?`],
  delai: [(titre) => `Combien de temps faut-il pour « ${titre} » ?`, (titre) => `Quel est le délai pour « ${titre} » ?`],
  lieu: [(titre) => `Où faire « ${titre} » ?`, (titre) => `Où dois-je aller pour « ${titre} » ?`],
  pieces: [(titre) => `Quels papiers faut-il pour « ${titre} » ?`, (titre) => `Quels documents dois-je apporter pour « ${titre} » ?`],
};

/** Ce que la fiche dit d'un champ, ou `null` : une liste de pièces vide vaut `null`. */
export function valeurDuChamp(fiche: Fiche, champ: Champ): string | string[] | null {
  if (champ === "pieces") return fiche.pieces.length > 0 ? fiche.pieces : null;
  return fiche[champ];
}

/** Une question par fiche vérifiée et par champ (les brouillons n'ont pas de réponse sur le site : ils sont ignorés). */
export function genererQuestionsFidelite(
  fiches: Fiche[],
  { champs = [...CHAMPS], variante = 0 }: { champs?: Champ[]; variante?: 0 | 1 } = {},
): QuestionFidelite[] {
  return fiches
    .filter((fiche) => fiche.statut === "verifie")
    .flatMap((fiche) =>
      champs.map((champ): QuestionFidelite => {
        const valeur = valeurDuChamp(fiche, champ);
        return {
          question: FORMULATIONS[champ][variante](fiche.titre),
          champ,
          fiche_slug: fiche.slug,
          valeur,
          attendu: valeur === null ? "ne_sait_pas" : "valeur",
        };
      }),
    );
}

export type StatutFidelite =
  /** L'introduction ne dit rien que la fiche ne dise. */
  | "fidele"
  /** La sortie du modèle inventait ; les garde-fous l'ont corrigée ou retirée : ce que la personne lit est propre. */
  | "corrige_par_garde_fous"
  /** L'introduction montrée contient un élément absent de la fiche : un garde-fou a laissé passer, échec critique. */
  | "invente"
  /** Le champ de la fiche est vide et l'introduction lui donne une valeur au lieu de dire « pas précisé ». */
  | "devine"
  /** La fiche est montrée sans introduction (IA absente, saturée, ou introduction refusée) : rien à contrôler. */
  | "sans_intro"
  /** Pas de fiche : « je ne sais pas », précision demandée ou hors domaine. */
  | "refus";

export type JugementFidelite = {
  statut: StatutFidelite;
  /** La fiche citée est celle de la question. */
  bonneFiche: boolean;
  /** Ce que l'introduction montrée dit de plus que la fiche citée. */
  absentsFinal: Element[];
  /** Ce que la sortie brute du modèle (avant les garde-fous) disait de plus que la fiche citée. */
  absentsBrut: Element[];
};

// Ce qu'il faut voir dans une introduction pour dire qu'elle donne une valeur, champ par champ. Ce sont des repères
// de mesure, pas des garde-fous : ils servent à repérer un champ vide « deviné », pas à filtrer ce qu'on affiche.
const REPERES_COUT = /\b(?:gratuit|gratuite|gratuits|gratuites|gratuitement|sans frais|aucun frais)\b/;
const REPERES_DELAI =
  /\b(?:immediat|immediatement|instantane|le jour meme|dans la journee|sur le champ|sur place|rapide|rapidement|aujourd'hui|demain|le lendemain|quelques (?:jours|semaines|heures|minutes|mois))\b/;
const REPERES_LIEU =
  /\b(?:commissariat|gendarmerie|brigade|prefecture|sous-prefecture|mairie|commune|centre|tribunal|greffe|ambassade|consulat|bureau|guichet|division|direction|ministere|poste de police|hopital|agence|chambre|section|service|caisse)\b/;
const REPERES_PIECES =
  /\b(?:photo|photos|copie|copies|certificat|extrait|acte|justificatif|justificatifs|piece|pieces|timbre|timbres|formulaire|attestation|livret|diplome|quittance|facture|casier|passeport|carte|permis)\b/;

/** Vrai quand `texte` (une introduction) donne une valeur pour `champ`. */
function donneUneValeur(champ: Champ, texte: string): boolean {
  const simple = simplifier(texte).replace(/[’‘]/g, "'");
  const elements = extraireElements(texte);
  switch (champ) {
    case "cout":
      return elements.some((e) => e.type === "montant" || e.type === "nombre") || REPERES_COUT.test(simple);
    case "delai":
      return elements.some((e) => e.type === "duree" || e.type === "nombre") || REPERES_DELAI.test(simple);
    case "lieu":
      return REPERES_LIEU.test(simple);
    case "pieces": {
      // Une liste de documents : un mot de document et au moins un séparateur (« une photo, un acte et un timbre »).
      const separateurs = (simple.match(/[,;]| et /g) ?? []).length;
      return REPERES_PIECES.test(simple) && separateurs >= 1;
    }
  }
}

/**
 * Juge la fidélité de ce que le site a répondu à `q`. On contrôle la fiche CITÉE par la réponse, pas celle qu'on attendait :
 * `bonneFiche` dit si c'est la bonne. `introBrute` est le texte du modèle avant les garde-fous (`null` s'il n'a rien écrit).
 * Ordre de gravité : invente, devine, corrige_par_garde_fous, fidele.
 */
export function jugerFidelite(
  q: QuestionFidelite,
  sortie: { reponse: Reponse; introBrute: string | null },
): JugementFidelite {
  const { reponse, introBrute } = sortie;
  if (reponse.type !== "fiche") return { statut: "refus", bonneFiche: false, absentsFinal: [], absentsBrut: [] };

  const { fiche, intro } = reponse;
  const bonneFiche = fiche.slug === q.fiche_slug;
  const options = { question: q.question };
  const absentsBrut = introBrute === null ? [] : controlerFidelite(introBrute, fiche, options).absents;

  // Sans introduction, rien d'inventé n'est montré ; si le modèle avait inventé, c'est un garde-fou qui l'a retirée.
  if (intro === null) {
    return { statut: absentsBrut.length > 0 ? "corrige_par_garde_fous" : "sans_intro", bonneFiche, absentsFinal: [], absentsBrut };
  }

  const absentsFinal = controlerFidelite(intro, fiche, options).absents;
  const resultat = (statut: StatutFidelite): JugementFidelite => ({ statut, bonneFiche, absentsFinal, absentsBrut });

  if (absentsFinal.length > 0) return resultat("invente");
  if (valeurDuChamp(fiche, q.champ) === null && !ditNePasSavoir(intro) && donneUneValeur(q.champ, intro)) {
    return resultat("devine");
  }
  return resultat(absentsBrut.length > 0 ? "corrige_par_garde_fous" : "fidele");
}
