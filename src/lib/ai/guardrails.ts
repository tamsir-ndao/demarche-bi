import type { Fiche } from "../fiches/schema";
import { simplifier } from "../texte";

// Étape « Vérifier » de /api/ask : écrite en code, jamais contournée. Le modèle écrit l'introduction de la réponse ;
// on ne la montre que si elle reste fidèle à la fiche : aucun nombre ni adresse nouveaux, aucun balisage ni
// identifiant interne. Sinon l'appelant montre la fiche sans introduction.

export type Verdict = { ok: true; intro: string } | { ok: false; raison: string };

const LONGUEUR_MAX_INTRO = 450;

// Un nombre : « 10 000 », « 10.000 », « 10000 » (milliers) ou « 2,5 » (décimale). Une tranche de milliers fait
// exactement 3 chiffres et n'est pas suivie d'un autre chiffre (« 800 00 2012 » donne 800, 00 et 2012).
const NOMBRE = /(?<!\d)(?:(\d{1,3}(?:[ \u00a0\u202f.,]\d{3})+(?!\d))(?:,(\d+))?|(\d+)(?:[.,](\d+))?)/g;

/** Les nombres d'un texte, écrits de façon unique : « 10 000 » et « 10.000 » donnent « 10000 ». */
export function extraireNombres(texte: string): string[] {
  return [...texte.matchAll(NOMBRE)].map((trouve) => {
    const [, milliers, decimalesMilliers, entier, decimales] = trouve;
    if (milliers !== undefined) return milliers.replace(/\D/g, "") + (decimalesMilliers ? `.${decimalesMilliers}` : "");
    return entier + (decimales ? `.${decimales}` : "");
  });
}

// Nombres écrits en toutes lettres (sans « un » et « une », qui sont aussi des articles).
const MOTS_NOMBRES: Record<string, number> = {
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
  cent: 100,
  cents: 100,
  mille: 1000,
  million: 1000000,
  millions: 1000000,
};

/** Les mots d'un texte, en minuscules et sans accents. */
function motsDe(texte: string): string[] {
  return simplifier(texte).split(/[^a-z]+/);
}

function motsDeNombres(texte: string): string[] {
  return motsDe(texte).filter((mot) => mot in MOTS_NOMBRES);
}

// Mots qui affirment plus que la fiche (« la seule pièce », « c'est gratuit », « toujours ») : l'introduction ne les emploie
// que si la fiche emploie le même mot, à l'accord près (gratuit, gratuite). Écrits sans accent, comme `simplifier` les rend.
const FAMILLES_ABSOLUES = [
  ["seul", "seule", "seuls", "seules"],
  ["seulement"],
  ["uniquement"],
  ["exclusivement"],
  ["toujours"],
  ["jamais"],
  ["aucun", "aucune"],
  ["tous", "toutes"],
  ["gratuit", "gratuite", "gratuits", "gratuites", "gratuitement"],
  ["obligatoire", "obligatoires"],
  ["automatiquement"],
  ["systematiquement"],
  ["immediatement"],
];

const FAMILLE_DU_MOT = new Map(FAMILLES_ABSOLUES.flatMap((famille) => famille.map((mot) => [mot, famille] as const)));

const BALISAGE = /[<>`]|\*\*/;
const ADRESSE = /https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[\w.]+|\b[a-z0-9-]+\.(?:sn|com|org|net|fr|gouv)\b/i;

function nettoyer(texte: string): string {
  return texte.replace(/\u2011/g, "-").replace(/\s+/g, " ").trim();
}

function texteDeLaFiche(fiche: Fiche): string {
  return [
    fiche.titre,
    fiche.resume,
    ...fiche.pieces,
    ...fiche.etapes,
    fiche.cout ?? "",
    fiche.delai ?? "",
    fiche.lieu ?? "",
    fiche.corps,
  ].join("\n");
}

/**
 * Les mots absolus de `texte` (voir plus haut) que la fiche n'emploie pas, à l'accord près : tels qu'écrits, en minuscules,
 * sans doublon. Appliquée à l'introduction, elle donne ce qui la fait refuser ; appliquée à la question, ce que le modèle
 * ne doit pas reprendre.
 */
export function motsAbsolusNonPermis(texte: string, fiche: Fiche): string[] {
  const motsDeLaFiche = new Set(motsDe(texteDeLaFiche(fiche)));
  const trouves = new Set<string>();
  for (const [mot] of texte.matchAll(/\p{L}+/gu)) {
    const famille = FAMILLE_DU_MOT.get(simplifier(mot));
    if (famille !== undefined && !famille.some((forme) => motsDeLaFiche.has(forme))) trouves.add(mot.toLowerCase());
  }
  return [...trouves];
}

/**
 * Vérifie l'introduction écrite par le modèle à partir de `fiche` (le cas « la fiche ne répond pas » se traite avant).
 * `slugs` sont les identifiants internes des fiches du site : ils ne doivent pas apparaître dans le texte.
 * Renvoie le texte nettoyé, ou la raison du rejet (qu'on peut redonner au modèle pour qu'il corrige).
 */
export function verifierIntro(intro: string, fiche: Fiche, { slugs = [] }: { slugs?: string[] } = {}): Verdict {
  const rejet = (raison: string): Verdict => ({ ok: false, raison });

  const texte = nettoyer(intro);
  if (texte === "" || texte.length > LONGUEUR_MAX_INTRO) return rejet("Introduction vide ou trop longue.");
  if (BALISAGE.test(texte)) return rejet("Balisage dans le texte (la fiche n'en contient pas).");
  if (ADRESSE.test(texte)) return rejet("Adresse web ou e-mail absente de la fiche.");

  const minuscules = texte.toLowerCase();
  const interne = slugs.find((slug) => slug.includes("-") && minuscules.includes(slug));
  if (interne !== undefined) return rejet(`Identifiant interne « ${interne} » dans le texte.`);

  const source = texteDeLaFiche(fiche);
  const nombresDeLaFiche = new Set(extraireNombres(source));
  const inconnu = extraireNombres(texte).find((nombre) => !nombresDeLaFiche.has(nombre));
  if (inconnu !== undefined) return rejet(`Nombre « ${inconnu} » absent de la fiche.`);

  const motsDeLaFiche = new Set(motsDe(source));
  const motInconnu = motsDeNombres(texte).find(
    (mot) => !motsDeLaFiche.has(mot) && !nombresDeLaFiche.has(String(MOTS_NOMBRES[mot])),
  );
  if (motInconnu !== undefined) return rejet(`Nombre « ${motInconnu} » absent de la fiche.`);

  const [absolu] = motsAbsolusNonPermis(texte, fiche);
  if (absolu !== undefined) {
    return rejet(`Mot absolu « ${absolu} » absent de la fiche : ne le reprends pas, même pour dire le contraire. Dis ce que la fiche indique.`);
  }

  return { ok: true, intro: texte };
}

const LONGUEUR_MAX_MESSAGE = 220;

/** « francs », « FCFA » ou « CFA » : un montant, quel que soit le chiffre. */
const MONTANT = /\b(?:fcfa|cfa|francs?)\b/i;

/**
 * Vérifie la phrase que le modèle écrit quand aucune fiche ne répond (sujet hors domaine, ou démarche que le site n'a
 * pas). Elle reprend le sujet de la question avec politesse et n'affirme rien sur l'administration : pas de balisage,
 * d'adresse, d'identifiant interne, de chiffre ni de montant (même repris de la question, qui pourrait lui en faire
 * dire). Renvoie le texte nettoyé, ou `null` : le site dit alors sa phrase habituelle.
 */
export function verifierMessageSansReponse(message: string, { slugs = [] }: { slugs?: string[] } = {}): string | null {
  const texte = nettoyer(message);
  if (texte === "" || texte.length > LONGUEUR_MAX_MESSAGE) return null;
  if (BALISAGE.test(texte) || ADRESSE.test(texte) || MONTANT.test(texte)) return null;

  const minuscules = texte.toLowerCase();
  if (slugs.some((slug) => slug.includes("-") && minuscules.includes(slug))) return null;
  if (/\d/.test(texte) || motsDeNombres(texte).length > 0) return null;
  return texte;
}

// Les mots qui annoncent une démarche administrative (écrits sans accent, au singulier), ou le début de ces mots.
const MOTS_DE_DEMARCHE = new Set(
  (
    "permis carte passeport certificat acte extrait casier naissance mariage deces quitus attestation diplome bourse " +
    "impot taxe fiscal douane ninea rccm nif tva dgid registre mairie commissariat gendarmerie prefecture tribunal greffe " +
    "consulat ambassade cni duplicata document papier formulaire dossier timbre pension retraite cotisation ipres cmu " +
    "electeur electoral foncier cadastre entreprise societe apix concours residence sejour domicile identite justice police civil"
  ).split(" "),
);
const DEBUTS_DE_DEMARCHE = ["immatricul", "renouvel", "legalis", "apostill", "administrat", "nationalit", "naturalis", "demarch"];

/**
 * Vrai quand la question contient un mot de démarche administrative (permis, carte, acte, impôt…). Une telle question
 * n'est jamais « hors domaine » : au pire, le site n'a pas encore la démarche. Large exprès : dans le doute, on ne dit
 * pas à quelqu'un que sa démarche n'est pas du domaine du site.
 */
export function ressembleAUneDemarche(question: string): boolean {
  return motsDe(question).some((mot) => {
    if (mot === "") return false;
    return (
      MOTS_DE_DEMARCHE.has(mot) ||
      MOTS_DE_DEMARCHE.has(mot.replace(/[sx]$/, "")) ||
      DEBUTS_DE_DEMARCHE.some((debut) => mot.startsWith(debut))
    );
  });
}

/**
 * Expressions régulières détectant les demandes frauduleuses, falsifiées ou illégales :
 * fabrication de faux documents, falsification, corruption, pot-de-vin, fraude fiscale ou douanière, etc.
 */
const MOTIFS_FRAUDE: RegExp[] = [
  /\b(?:fabriquer|faire|avoir|acheter|obtenir|creer|produire|procurer|trouver|vendre)\s+(?:un|une|des)?\s*faux\b/i,
  /\b(?:faux|fausse|fausses)\s+(?:papier|papiers|passeport|passeports|carte|cartes|cni|permis|acte|actes|extrait|extraits|certificat|certificats|diplome|diplomes|plaque|plaques|timbre|timbres|quittance|quittances|document|documents|signature|signatures|immatriculation)\b/i,
  /\bfalsifi/i,
  /\btruqu/i,
  /\bcorromp/i,
  /\bcorruption\b/i,
  /\bpot[s]?-de-vin\b/i,
  /\bdessous[- ]de[- ]table\b/i,
  /\bbakchich\b/i,
  /\btchoko\b/i,
  /\b(?:en\s+)?fraude(?:r|ur|use|s)?\b/i,
  /\busurp/i,
  /\bcontourner\s+la\s+(?:douane|loi)\b/i,
  /\bsans\s+(?:passer|faire)\s+(?:l['’]?examen|le\s+permis)\b/i,
  /\bacheter\s+(?:le|un)\s+permis\b/i,
  /\billegal/i,
];

/**
 * Vrai quand la question concerne une pratique frauduleuse, falsifiée, corrompue ou illégale.
 * Permet au système de refuser poliment et fermement sans chercher de fiche ni halluciner.
 */
export function estDemandeFrauduleuse(question: string): boolean {
  const texte = simplifier(question);
  return MOTIFS_FRAUDE.some((motif) => motif.test(texte));
}

/**
 * Mots de salutations et de politesse en français, wolof et arabe (courants au Sénégal).
 */
const MOTS_SALUTATIONS = new Set([
  "bonjour", "bonsoir", "salut", "coucou", "allo",
  "salam", "aleykoum", "alaykum", "assalam", "assalamu", "malaikoum", "malekoum", "wa",
  "nanga", "naka", "nga", "def", "na",
  "yaangi", "yangi", "ci", "jamm", "diamm", "rek", "rekk",
  "kassoumay", "kasumay",
  "ca", "va", "comment", "allez", "vous", "tu", "vas",
  "merci", "aide", "moi", "aidez", "stp", "svp", "te", "plait"
]);

const RACINES_SALUTATIONS_OBLIGATOIRES = [
  "bonjour", "bonsoir", "salut", "salam", "nanga", "def", "kassoumay", "coucou",
];

/**
 * Vrai quand le message ne contient qu'une salutation ou formule de politesse (sans question administrative).
 * Permet de répondre chaleureusement en demandant à l'usager comment l'aider.
 */
export function estSalutationSeule(question: string): boolean {
  // Les chiffres restent : « Bonjour 2026 » ou un numéro après un salut, ce n'est plus une salutation seule.
  const texte = simplifier(question).replace(/[^a-z0-9]+/g, " ").trim();
  if (!texte) return false;
  const mots = texte.split(/\s+/).filter(Boolean);
  if (mots.length === 0) return false;
  const aUnMotCle = mots.some((mot) => RACINES_SALUTATIONS_OBLIGATOIRES.includes(mot));
  if (!aUnMotCle) return false;
  return mots.every((mot) => MOTS_SALUTATIONS.has(mot));
}
