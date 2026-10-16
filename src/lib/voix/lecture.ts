import { decouperPiece, estAConfirmer, notesDeLaFiche, type StatutAffichage } from "../fiches/affichage";
import type { Fiche } from "../fiches/schema";

// Ce que le téléphone dit à voix haute : l'essentiel de la fiche, dans l'ordre de l'écran, mis en forme pour la voix.
// Le détail (étapes, notes à confirmer, précisions des pièces) reste à l'écran. Rien n'est ajouté à la fiche :
// seules quelques phrases du site (renvois à l'écran, avertissements, « je ne sais pas ») s'y glissent.
// Chaque phrase dite est liée à un bloc de l'écran (`cible`) : pendant qu'elle est dite, ce bloc est surligné.
// Fonctions pures, testées. Le téléphone parle ensuite (voir parleur.ts).

/** Une phrase à dire, et le bloc de l'écran qu'elle concerne (`data-lecture` dans la page), ou `null` s'il n'y en a pas. */
export type LigneVocale = { texte: string; cible: string | null };

/** « 800 00 2012 » devient « 8 0 0, 0 0, 2 0 1 2 » : un numéro se dit chiffre par chiffre, pas comme un nombre. */
function epeler(numero: string): string {
  const plus = numero.startsWith("+") ? "plus " : "";
  const groupes = numero.replace(/^\+/, "").split(/[ .]+/).filter(Boolean);
  return plus + groupes.map((groupe) => groupe.split("").join(" ")).join(", ");
}

/**
 * Le texte tel que la voix le lit sans buter : « francs CFA » à la place de FCFA, un montant d'un seul bloc de
 * chiffres (« 10000 » : chaque téléphone dit « dix mille » ; un numéro de téléphone « 77 123 45 67 » reste tel quel),
 * un numéro vert chiffre par chiffre, pas de guillemets
 * ni de parenthèses (elles deviennent des pauses).
 */
export function pourLaVoix(texte: string): string {
  return texte
    .replace(/[\u00a0\u202f\u2009]/g, " ")
    .replace(/(num[eé]ro vert\s*:?\s*)(\+?\d[\d .]{5,}\d)/gi, (_, debut: string, numero: string) => debut + epeler(numero))
    .replace(/\b\d{1,3}(?: \d{3})+\b(?! \d)/g, (montant) => montant.replace(/ /g, ""))
    .replace(/\bFCFA\b/g, "francs CFA")
    .replace(/\bn°\s*/gi, "numéro ")
    .replace(/[«»]/g, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s*&\s*/g, " et ")
    .replace(/\s*\(([^()]*)\)/g, ", $1,")
    .replace(/\s+,/g, ",")
    .replace(/,(\s*,)+/g, ",")
    .replace(/,\s*([.!?;:])/g, "$1")
    .replace(/^\s*,\s*/, "")
    .replace(/,\s*$/, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Longueur maximale d'un morceau : Chrome coupe la voix d'un texte trop long au bout d'une quinzaine de secondes. */
const LONGUEUR_MAX_MORCEAU = 200;

/** La dernière coupure naturelle (après une virgule, un point-virgule ou deux-points) dans les `max` premiers caractères. */
function dernierePause(texte: string, max: number): number {
  for (let i = Math.min(max, texte.length - 1); i > 0; i -= 1) {
    if (/[,;:]/.test(texte[i - 1]) && texte[i] === " ") return i;
  }
  return -1;
}

/** Coupe une phrase trop longue à une pause, sinon à une espace, sinon (mot immense) à la limite. */
function couper(phrase: string, max: number): string[] {
  const morceaux: string[] = [];
  let reste = phrase;
  while (reste.length > max) {
    let coupure = dernierePause(reste, max);
    if (coupure <= 0) coupure = reste.lastIndexOf(" ", max);
    if (coupure <= 0) coupure = max;
    morceaux.push(reste.slice(0, coupure).trim());
    reste = reste.slice(coupure).trim();
  }
  if (reste !== "") morceaux.push(reste);
  return morceaux;
}

/** Les morceaux que le téléphone dira l'un après l'autre : une phrase chacun, jamais plus de `max` caractères. */
export function decouperPourLaVoix(texte: string, max: number = LONGUEUR_MAX_MORCEAU): string[] {
  return texte
    .split(/\r?\n/)
    .flatMap((ligne) => ligne.split(/(?<=[.!?…])\s+/))
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase !== "")
    .flatMap((phrase) => couper(phrase, max));
}

/** Des paragraphes écrits pour l'écran aux morceaux prêts pour la voix ; chaque morceau garde le bloc de son paragraphe. */
export function preparerLaLecture(paragraphes: (string | LigneVocale)[]): LigneVocale[] {
  return paragraphes.flatMap((paragraphe) => {
    const { texte, cible } = typeof paragraphe === "string" ? { texte: paragraphe, cible: null } : paragraphe;
    return decouperPourLaVoix(pourLaVoix(texte)).map((morceau) => ({ texte: morceau, cible }));
  });
}

/** Une phrase finit par un point, même quand le texte de la fiche n'en a pas (un titre, une pièce). */
function phrase(texte: string): string {
  const net = texte.trim();
  return /[.!?…]$/.test(net) ? net : `${net}.`;
}

/** L'avertissement d'une fiche pas vérifiée ou vérifiée depuis trop longtemps ; une fiche à jour n'en a pas. */
function phraseStatut(statut: StatutAffichage): string | null {
  if (statut.type === "brouillon") return "Attention, cette fiche n’est pas encore vérifiée.";
  if (statut.type === "perimee") return "Attention, cette fiche a été vérifiée il y a plus d’un an.";
  return null;
}

/** Au-delà de cette longueur, un délai ou un lieu n'est dit que jusqu'à son premier point-virgule ou sa première phrase. */
const LONGUEUR_MAX_FAIT = 100;

/** Le nombre de pièces dites une à une ; les autres restent à lire à l'écran. */
const PIECES_MAX = 6;

/**
 * Le début d'un texte trop long, jusqu'à son premier point-virgule ou sa première fin de phrase (`coupe` le dit).
 * Sans l'un ni l'autre, le texte reste entier : on ne coupe jamais une phrase au milieu.
 */
export function abreger(texte: string, max: number): { texte: string; coupe: boolean } {
  if (texte.length <= max) return { texte, coupe: false };
  const fin = texte.search(/;|\.\s/);
  if (fin <= 0) return { texte, coupe: false };
  return { texte: texte.slice(0, fin).trim(), coupe: true };
}

function fait(libelle: string, valeur: string | null, cible: string, { court = false } = {}): LigneVocale {
  if (valeur === null) return { texte: `${libelle} : non précisé.`, cible };
  const { texte, coupe } = court ? abreger(valeur, LONGUEUR_MAX_FAIT) : { texte: valeur, coupe: false };
  return { texte: `${libelle} : ${phrase(texte)}${coupe ? " Le reste est à l’écran." : ""}`, cible };
}

function autresPieces(nombre: number): string {
  return nombre === 1 ? "Et 1 autre pièce, à l’écran." : `Et ${nombre} autres pièces, à l’écran.`;
}

/**
 * L'essentiel d'une fiche, dans l'ordre de l'écran : l'avertissement d'une fiche pas à jour, la phrase qui répond (ou
 * le titre), le coût, le délai et le lieu, un renvoi vers ce qui est à confirmer, les pièces à apporter, puis le
 * nombre d'étapes. Chaque élément est repris tel que la fiche le donne ; ce qu'elle ne dit pas reste « non précisé ».
 * Les étapes, les notes à confirmer et les précisions entre parenthèses des pièces restent à l'écran.
 */
export function scriptFiche({ fiche, statut, intro }: { fiche: Fiche; statut: StatutAffichage; intro: string | null }): LigneVocale[] {
  const lignes: LigneVocale[] = [];
  const avertissement = phraseStatut(statut);
  if (avertissement) lignes.push({ texte: avertissement, cible: "statut" });
  lignes.push(intro ? { texte: phrase(intro), cible: "intro" } : { texte: phrase(fiche.titre), cible: "titre" });
  lignes.push(
    fait("Coût", fiche.cout, "cout"),
    fait("Délai", fiche.delai, "delai", { court: true }),
    fait("Où", fiche.lieu, "lieu", { court: true }),
  );

  const pieces = fiche.pieces.map(decouperPiece);
  const aConfirmer = notesDeLaFiche(fiche.corps).some(estAConfirmer) || pieces.some((piece) => piece.aConfirmer);
  if (aConfirmer) lignes.push({ texte: "Attention, une information est à confirmer : regarde l’écran.", cible: "a-confirmer" });

  if (pieces.length > 0) {
    lignes.push({ texte: "Ce qu’il faut apporter.", cible: "pieces" });
    pieces.slice(0, PIECES_MAX).forEach((piece, index) => lignes.push({ texte: phrase(piece.principal), cible: `piece-${index}` }));
    if (pieces.length > PIECES_MAX) lignes.push({ texte: autresPieces(pieces.length - PIECES_MAX), cible: "pieces" });
  }

  const etapes = fiche.etapes.length;
  lignes.push({ texte: `Il y a ${etapes} ${etapes === 1 ? "étape" : "étapes"}, juste en dessous.`, cible: "etapes" });
  return lignes;
}

// Les écrans suivants répètent les phrases de JeNeSaisPas.tsx, HorsDomaine.tsx et Precision.tsx : si l'un change, l'autre aussi.

/** « Je ne sais pas encore » : la franchise du site, dite à voix haute. `message` : la phrase écrite pour la question. */
export function scriptInconnue(message?: string): string[] {
  return [
    "Je ne sais pas encore.",
    message ?? "Je n’ai pas de source officielle pour ça. Je préfère te le dire plutôt que d’inventer.",
  ];
}

/** La question n'a aucun rapport avec les démarches : on le dit poliment. `message` : la phrase écrite pour la question. */
export function scriptHorsDomaine(message?: string): string[] {
  return [
    "Ce n’est pas mon domaine.",
    message ?? "Je réponds aux questions sur les démarches administratives au Sénégal : papiers, certificats, permis…",
  ];
}

/** Plusieurs démarches pourraient répondre : on pose la question et on dit quoi choisir à l'écran. */
export function scriptPrecision({ question, options }: { question: string; options: { titre: string }[] }): string[] {
  const titres = options.map((option) => option.titre).join(" ; ");
  return [phrase(question || "Que veux-tu faire ?"), `Choisis une démarche à l’écran : ${titres} ; ou autre chose.`];
}

/** La question est trop vague : on demande un détail. */
export function scriptPrecisionGenerale({ question }: { question: string }): string[] {
  return [phrase(question || "Peux-tu préciser ta question ?"), "Ajoute un détail, et je te réponds."];
}

/** Demande frauduleuse ou illégale : on rappelle poliment l'interdiction par la loi. */
export function scriptInterdit(message?: string): string[] {
  return [
    "Interdit par la loi.",
    message ?? "Cette démarche est interdite par la loi. Je ne peux pas t’aider pour une pratique frauduleuse ou illégale.",
  ];
}

/** Salutations seules : on répond chaleureusement en demandant comment aider. */
export function scriptSalutation(message?: string): string[] {
  return [
    "Salam aleykoum !",
    message ?? "Comment puis-je t’aider aujourd’hui ? Pose-moi ta question sur tes démarches administratives au Sénégal.",
  ];
}
