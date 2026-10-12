import { estAConfirmer, notesDeLaFiche, type StatutAffichage } from "../fiches/affichage";
import type { Fiche } from "../fiches/schema";

// Ce que le téléphone dit à voix haute : le texte de la fiche, dans l'ordre de l'écran, mis en forme pour la voix.
// Rien n'est ajouté à la fiche : seules quelques phrases du site (avertissements, « je ne sais pas ») s'y glissent.
// Fonctions pures, testées. Le téléphone parle ensuite (voir parleur.ts).

const MOIS_COMPLETS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** « 2026-10-14 » devient « 14 octobre 2026 » (et « premier mars 2026 ») : la voix ne sait pas dire « oct. ». */
export function dateParlee(iso: string): string {
  const [annee, mois, jour] = iso.split("-").map(Number);
  const nomMois = MOIS_COMPLETS[mois - 1];
  if (!annee || !jour || !nomMois) return iso;
  return `${jour === 1 ? "premier" : jour} ${nomMois} ${annee}`;
}

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

/** Des paragraphes écrits pour l'écran aux morceaux prêts pour la voix. */
export function preparerLaLecture(paragraphes: string[]): string[] {
  return paragraphes.flatMap((paragraphe) => decouperPourLaVoix(pourLaVoix(paragraphe)));
}

/** Une phrase finit par un point, même quand le texte de la fiche n'en a pas (un titre, une pièce). */
function phrase(texte: string): string {
  const net = texte.trim();
  return /[.!?…]$/.test(net) ? net : `${net}.`;
}

function phraseStatut(fiche: Pick<Fiche, "verifie_le">, statut: StatutAffichage): string {
  if (statut.type === "brouillon") return "Attention, cette fiche n’est pas encore vérifiée.";
  if (statut.type === "perimee") return "Attention, cette fiche a été vérifiée il y a plus d’un an.";
  return fiche.verifie_le ? `Fiche vérifiée le ${dateParlee(fiche.verifie_le)}.` : "Fiche vérifiée.";
}

function fait(libelle: string, valeur: string | null): string {
  return valeur === null ? `${libelle} : non précisé, la source ne le dit pas.` : `${libelle} : ${phrase(valeur)}`;
}

/**
 * La réponse d'une fiche, dans l'ordre de l'écran : l'état de la fiche, le titre, la phrase de l'IA (signalée), le coût,
 * le délai et le lieu, ce qui reste à confirmer, les pièces, les étapes, et l'avertissement du site.
 * Chaque élément est repris tel que la fiche le donne ; ce qu'elle ne dit pas reste « non précisé ».
 */
export function scriptFiche({ fiche, statut, intro }: { fiche: Fiche; statut: StatutAffichage; intro: string | null }): string[] {
  const paragraphes = [phraseStatut(fiche, statut), phrase(fiche.titre), phrase(intro ?? fiche.resume)];
  if (intro) paragraphes.push("Cette phrase est écrite par l’IA, d’après la fiche.");
  paragraphes.push(fait("Coût", fiche.cout), fait("Délai", fiche.delai), fait("Où", fiche.lieu));
  for (const note of notesDeLaFiche(fiche.corps).filter(estAConfirmer)) paragraphes.push(`À confirmer. ${phrase(note)}`);
  if (fiche.pieces.length > 0) {
    paragraphes.push("Ce qu’il faut apporter.");
    for (const piece of fiche.pieces) paragraphes.push(phrase(piece));
  }
  paragraphes.push("Les étapes.");
  fiche.etapes.forEach((etape, index) => paragraphes.push(`Étape ${index + 1}. ${phrase(etape)}`));
  paragraphes.push("Information indicative, à vérifier avant de te déplacer.");
  return paragraphes;
}

// Les trois écrans suivants répètent les phrases de JeNeSaisPas.tsx et Precision.tsx : si l'un change, l'autre aussi.

/** « Je ne sais pas encore » : la franchise du site, dite à voix haute. */
export function scriptInconnue(): string[] {
  return [
    "Je ne sais pas encore.",
    "Je n’ai pas de source officielle pour ça. Je préfère te le dire plutôt que d’inventer.",
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
