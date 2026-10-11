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

  const absolu = motsDe(texte).find((mot) => {
    const famille = FAMILLE_DU_MOT.get(mot);
    return famille !== undefined && !famille.some((forme) => motsDeLaFiche.has(forme));
  });
  if (absolu !== undefined) return rejet(`Mot absolu « ${absolu} » absent de la fiche : n'affirme rien de plus qu'elle.`);

  return { ok: true, intro: texte };
}
