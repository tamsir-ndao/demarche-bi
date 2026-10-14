import { extraireNombres } from "../ai/guardrails";
import type { Fiche } from "../fiches/schema";
import { simplifier } from "../texte";

// Contrôleur de fidélité : compare un texte écrit par l'IA (l'introduction d'une réponse) à la fiche citée, et liste
// ce que la fiche ne dit pas. Il mesure ; il ne remplace pas les garde-fous de `guardrails.ts` (qui, eux, filtrent
// avant l'affichage). Quatre sortes d'éléments : nombres, montants, durées, noms propres. Les mots absolus
// (« gratuit », « tous »…) restent l'affaire de `motsAbsolusNonPermis`.

export type TypeElement = "nombre" | "montant" | "duree" | "nom_propre";
export type Element = { type: TypeElement; texte: string };
export type ControleFidelite = { elements: Element[]; absents: Element[]; fidele: boolean };

/**
 * Noms propres que l'IA peut écrire sans que la fiche les cite : le pays et le nom du site. Comme les mots de la question,
 * ils ne valent que pour les noms propres, jamais pour les nombres. FCFA et CFA : l'unité écrite sans nombre (« en FCFA »).
 */
const NOMS_TOLERES = ["Sénégal", "Démarche-Bi", "FCFA", "CFA"];

/** Le texte contre lequel on contrôle : tout ce que la fiche dit (la même matière que `texteDeLaFiche` des garde-fous, plus les titres des sources). */
export function texteDeReference(fiche: Fiche): string {
  return [
    fiche.titre,
    fiche.resume,
    ...fiche.pieces,
    ...fiche.etapes,
    fiche.cout ?? "",
    fiche.delai ?? "",
    fiche.lieu ?? "",
    fiche.corps,
    ...fiche.sources.map((source) => source.titre),
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------------------------------
// Nombres écrits en toutes lettres : « dix mille », « quatre-vingt-dix », « vingt et un »…

const MOTS_UNITES: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
};

const MOT_NOMBRE =
  "(?:deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?|mille|millions?)";
// « vingt et un », « trente-et-une », « soixante et onze » : « et » ne relie que deux mots d'une même suite.
const SUITE_DE_MOTS = new RegExp(
  `(?<![\\p{L}-])${MOT_NOMBRE}(?:(?:\\s+et\\s+|-et-)(?:${MOT_NOMBRE}|une?)|[\\s-]+${MOT_NOMBRE})*(?![\\p{L}]|-\\p{L})`,
  "giu",
);

/** La valeur d'une suite de mots-nombres, ou `null` si elle n'en est pas une. */
function valeurDesMots(suite: string): number | null {
  let total = 0;
  let courant = 0;
  let precedent = "";
  for (const brut of suite.toLowerCase().split(/[\s-]+/)) {
    if (brut === "et") continue;
    const mot = brut.replace(/^(cent|vingt|million)s$/, "$1");
    if (mot === "cent") courant = (courant === 0 ? 1 : courant) * 100;
    else if (mot === "mille") {
      total += (courant === 0 ? 1 : courant) * 1000;
      courant = 0;
    } else if (mot === "million") {
      total += (courant === 0 ? 1 : courant) * 1_000_000;
      courant = 0;
    } else if (mot === "vingt" && precedent === "quatre") courant += 76; // quatre-vingt : 4 + 76 = 80
    else if (mot in MOTS_UNITES) courant += MOTS_UNITES[mot];
    else return null;
    precedent = mot;
  }
  return total + courant;
}

// ---------------------------------------------------------------------------------------------------------------------
// Chiffres, unités et plages

/** Une suite de chiffres avec ses séparateurs (« 10 000 », « 10.000 », « 2,5 »). Les valeurs viennent de `extraireNombres`. */
const CHIFFRES = /\d(?:[\d   .,]*\d)?/g;

const UNITE_MONTANT = /^[\s  ]*(f\s?cfa|cfa|francs?(?:\s+cfa)?)(?![\p{L}])/iu;
const UNITE_DUREE = /^[\s  ]*(jours?|jrs?|semaines?|mois|ans?|ann[ée]es?|heures?|h|minutes?|min)(?![\p{L}])/iu;
// « un jour », « une semaine » : « un » ne compte comme nombre que devant une durée.
const UN_DEVANT_DUREE =
  /(?<![\p{L}-])une?(?=[\s  ]+(?:jours?|semaines?|mois|ans?|ann[ée]es?|heures?|minutes?)(?![\p{L}]))/giu;
// Entre deux nombres, seulement « à », « ou », un tiret ou une barre : « 2 à 3 jours », « 15-30 jours ».
const SEPARATEUR_DE_PLAGE = /^[\s  ]*(?:à|a|au|ou|jusqu['’]à|-|–|—|\/)[\s  ]*$/iu;

type UniteDeDuree = "jour" | "semaine" | "mois" | "an" | "heure" | "minute";

function uniteDeDuree(ecrite: string): UniteDeDuree {
  const mot = simplifier(ecrite);
  if (mot.startsWith("j")) return "jour";
  if (mot.startsWith("s")) return "semaine";
  if (mot === "mois") return "mois";
  if (mot.startsWith("a")) return "an";
  if (mot.startsWith("h")) return "heure";
  return "minute";
}

type Unite = { genre: "montant" | "duree"; ecrite: string; canonique: string; longueur: number };

type Brut = {
  debut: number;
  fin: number;
  /** Valeur normalisée, comme `extraireNombres` l'écrit (« 10000 », « 2.5 »). */
  valeur: string;
  ecrit: string;
  /** Faux pour un nombre qui n'est pas le dernier de sa suite de chiffres : l'unité qui suit ne le concerne pas. */
  peutAvoirUneUnite: boolean;
};

const normaliserEspaces = (texte: string) => texte.replace(/[\s  ]+/g, " ").trim();

function nombresEcritsEnChiffres(texte: string): Brut[] {
  const trouves: Brut[] = [];
  for (const suite of texte.matchAll(CHIFFRES)) {
    const valeurs = extraireNombres(suite[0]);
    const debut = suite.index;
    const fin = debut + suite[0].length;
    valeurs.forEach((valeur, rang) => {
      const dernier = rang === valeurs.length - 1;
      trouves.push({ debut, fin, valeur, ecrit: valeurs.length === 1 ? normaliserEspaces(suite[0]) : valeur, peutAvoirUneUnite: dernier });
    });
  }
  return trouves;
}

function nombresEcritsEnLettres(texte: string): Brut[] {
  const trouves: Brut[] = [];
  for (const suite of texte.matchAll(SUITE_DE_MOTS)) {
    const valeur = valeurDesMots(suite[0]);
    if (valeur === null) continue;
    const debut = suite.index;
    const fin = debut + suite[0].length;
    // « véhicule neuf » : « neuf » seul n'est un nombre que devant une unité (« neuf jours »).
    if (suite[0].toLowerCase() === "neuf" && !UNITE_DUREE.test(texte.slice(fin)) && !UNITE_MONTANT.test(texte.slice(fin))) continue;
    trouves.push({ debut, fin, valeur: String(valeur), ecrit: suite[0], peutAvoirUneUnite: true });
  }
  for (const un of texte.matchAll(UN_DEVANT_DUREE)) {
    // « vingt et un jours » : le « un » appartient déjà à la suite de mots.
    if (trouves.some((suite) => un.index >= suite.debut && un.index < suite.fin)) continue;
    trouves.push({ debut: un.index, fin: un.index + un[0].length, valeur: "1", ecrit: un[0], peutAvoirUneUnite: true });
  }
  return trouves;
}

function uniteSuivante(texte: string, fin: number): Unite | null {
  const reste = texte.slice(fin);
  const montant = UNITE_MONTANT.exec(reste);
  if (montant) return { genre: "montant", ecrite: normaliserEspaces(montant[1]), canonique: "FCFA", longueur: montant[0].length };
  const duree = UNITE_DUREE.exec(reste);
  if (duree) {
    return { genre: "duree", ecrite: normaliserEspaces(duree[1]), canonique: uniteDeDuree(duree[1]), longueur: duree[0].length };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Analyse d'un texte

type Trouve = { debut: number; type: TypeElement; texte: string; cle: string; parties: string[] };

type Analyse = {
  trouves: Trouve[];
  /** Les valeurs de tous les nombres, avec ou sans unité. */
  nombres: Set<string>;
  /** Les mots du texte, en minuscules et sans accents. */
  mots: Set<string>;
};

const motsSimples = (texte: string) => simplifier(texte.replace(/[’‘]/g, "'")).split(/[^a-z0-9]+/).filter((mot) => mot !== "");

/** Les caractères qui, avant un mot en majuscule, laissent croire à un début de phrase. */
const FIN_DE_PHRASE = new Set([".", "!", "?", "…", ":", "\n"]);
const OUVERTURES = new Set([" ", "\t", " ", " ", "«", '"', "“", "‘", "'", "(", "[", "-", "–", "—", "•", "*"]);

function debutDePhrase(texte: string, rang: number): boolean {
  for (let i = rang - 1; i >= 0; i -= 1) {
    const caractere = texte[i];
    if (FIN_DE_PHRASE.has(caractere)) return true;
    if (!OUVERTURES.has(caractere)) return false;
  }
  return true;
}

// Un code collé à un chiffre (« SG2 », « C1 ») n'est pas un nom propre.
const MOT_EN_MAJUSCULE = /(?<![\p{L}\p{M}\p{N}])\p{Lu}[\p{L}\p{M}]*(?:-\p{Lu}?[\p{L}\p{M}]+)*(?!\p{N})/gu;

function analyser(texte: string): Analyse {
  const bruts = [...nombresEcritsEnChiffres(texte), ...nombresEcritsEnLettres(texte)].sort((a, b) => a.debut - b.debut || a.fin - b.fin);

  // Unité propre à chaque nombre, ou celle du nombre qui suit dans une plage (« de 15 à 30 jours » : 15 jours).
  const unites: (Unite | null)[] = bruts.map(() => null);
  for (let i = bruts.length - 1; i >= 0; i -= 1) {
    if (!bruts[i].peutAvoirUneUnite) continue;
    unites[i] = uniteSuivante(texte, bruts[i].fin);
    const suivant = bruts[i + 1];
    if (unites[i] === null && suivant !== undefined && SEPARATEUR_DE_PLAGE.test(texte.slice(bruts[i].fin, suivant.debut))) {
      unites[i] = unites[i + 1];
    }
  }

  const trouves: Trouve[] = [];
  const nombres = new Set<string>();
  // Le texte dont les nombres et leurs unités sont remplacés par des zéros : il reste à y chercher les noms propres (un zéro
  // n'est ni une lettre ni une fin de phrase, et un code comme « SG2 » reste collé à son chiffre).
  const reste = texte.split("");
  const masquer = (debut: number, fin: number) => {
    for (let i = debut; i < fin; i += 1) reste[i] = "0";
  };

  bruts.forEach((brut, i) => {
    nombres.add(brut.valeur);
    const unite = unites[i];
    masquer(brut.debut, brut.fin);
    if (unite === null) {
      trouves.push({ debut: brut.debut, type: "nombre", texte: brut.ecrit, cle: brut.valeur, parties: [] });
      return;
    }
    // L'unité n'est masquée que si elle suit le nombre : celle d'une plage appartient à son propre nombre.
    const propre = uniteSuivante(texte, brut.fin);
    if (propre !== null) masquer(brut.fin, brut.fin + propre.longueur);
    trouves.push({
      debut: brut.debut,
      type: unite.genre === "montant" ? "montant" : "duree",
      texte: `${brut.ecrit} ${unite.ecrite}`,
      cle: unite.genre === "montant" ? brut.valeur : `${brut.valeur} ${unite.canonique}`,
      parties: [],
    });
  });

  const sansNombres = reste.join("");
  for (const mot of sansNombres.matchAll(MOT_EN_MAJUSCULE)) {
    if (mot[0].length < 2 || debutDePhrase(sansNombres, mot.index)) continue;
    trouves.push({ debut: mot.index, type: "nom_propre", texte: mot[0], cle: simplifier(mot[0]), parties: motsSimples(mot[0]) });
  }

  trouves.sort((a, b) => a.debut - b.debut);
  return { trouves, nombres, mots: new Set(motsSimples(texte)) };
}

/** Les éléments d'un texte, dans l'ordre, sans doublon : les nombres, montants, durées et noms propres qu'il écrit. */
export function extraireElements(texte: string): Element[] {
  const vus = new Set<string>();
  const elements: Element[] = [];
  for (const trouve of analyser(texte).trouves) {
    const identite = `${trouve.type}|${trouve.cle}`;
    if (vus.has(identite)) continue;
    vus.add(identite);
    elements.push({ type: trouve.type, texte: trouve.texte });
  }
  return elements;
}

/**
 * Compare les éléments de `texte` à ceux de la fiche. Un nombre doit se retrouver dans la fiche ; un montant, avec FCFA, CFA
 * ou francs (« 10.000 » et « 10 000 » sont le même) ; une durée, avec le même nombre et la même unité (« 48 heures » face à
 * « 2 jours » est signalé) ; un nom propre, sans tenir compte des accents ni de la casse.
 * `question` : ses mots sont tolérés pour les noms propres (« Thiès » écrit par la personne), jamais pour les nombres.
 * `tolerer` : textes que l'appelant accepte en connaissance de cause (un élément dont le texte est identique, ou, pour un nom propre, dont tous les mots figurent dans l'un d'eux).
 * Une suite de chiffres comme « 3 000, 4 500 » n'attribue l'unité qu'à son dernier nombre : les autres comptent comme nombres.
 */
export function controlerFidelite(
  texte: string,
  fiche: Fiche,
  { tolerer = [], question = "" }: { tolerer?: string[]; question?: string } = {},
): ControleFidelite {
  const reference = analyser(texteDeReference(fiche));
  const montants = new Set<string>();
  const durees = new Set<string>();
  for (const trouve of reference.trouves) {
    if (trouve.type === "montant") montants.add(trouve.cle);
    if (trouve.type === "duree") durees.add(trouve.cle);
  }

  const motsTolerables = new Set([...motsSimples(question), ...[...NOMS_TOLERES, ...tolerer].flatMap(motsSimples)]);
  const textesTolerables = new Set(tolerer.map((texteTolere) => simplifier(texteTolere).trim()));

  const present = (trouve: Trouve): boolean => {
    if (textesTolerables.has(simplifier(trouve.texte).trim())) return true;
    switch (trouve.type) {
      case "nombre":
        return reference.nombres.has(trouve.cle);
      case "montant":
        return montants.has(trouve.cle);
      case "duree":
        return durees.has(trouve.cle);
      case "nom_propre":
        return trouve.parties.every((mot) => reference.mots.has(mot) || motsTolerables.has(mot));
    }
  };

  const vus = new Set<string>();
  const elements: Element[] = [];
  const absents: Element[] = [];
  for (const trouve of analyser(texte).trouves) {
    const identite = `${trouve.type}|${trouve.cle}`;
    if (vus.has(identite)) continue;
    vus.add(identite);
    const element: Element = { type: trouve.type, texte: trouve.texte };
    elements.push(element);
    if (!present(trouve)) absents.push(element);
  }
  return { elements, absents, fidele: absents.length === 0 };
}

// ---------------------------------------------------------------------------------------------------------------------

// Les façons de dire « la fiche ne le dit pas », écrites sans accent (le texte est simplifié avant le test).
const FORMULES_NE_SAIT_PAS: RegExp[] = [
  /\b(?:pas|non) (?:precis|indiqu|mentionn|communiqu|renseign|specifi|defini|fixe|disponible|connu)/,
  /\bne (?:precise|indique|mentionne|communique|donne|dit|fournit|figure|specifie) pas/,
  /\bne (?:sais|sait|savons|savez|connais|connait|connaissons) pas/,
  /\bn'ai pas (?:cette |l')?information/,
  /\b(?:aucune? |pas d'|pas de |sans )(?:information|indication|precision|mention|donnee)/,
  /\binconnu/,
  /\ba (?:confirmer|preciser|verifier aupres|demander aupres)/,
];

/** Vrai quand le texte dit qu'il ne sait pas : « pas précisé », « non indiqué », « je ne sais pas », « à confirmer »… */
export function ditNePasSavoir(texte: string): boolean {
  const simple = simplifier(texte).replace(/[’‘]/g, "'");
  return FORMULES_NE_SAIT_PAS.some((formule) => formule.test(simple));
}
