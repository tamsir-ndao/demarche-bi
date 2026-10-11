import { simplifier, typographie } from "../texte";
import { CATEGORIES, estPerimee, type Fiche } from "./schema";

// Préparation des fiches pour l'écran : aucune information n'est ajoutée ici, on met en forme
// ce que la fiche contient (et « Non précisé » quand elle vaut null). Fonctions pures, sans
// accès aux fichiers : elles se testent et peuvent aussi servir côté navigateur.

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 2026-10-14 » devient « 14 oct. 2026 » (et « 1er mars 2026 »). Un texte qui n'est pas une date est rendu tel quel. */
export function formaterDate(iso: string): string {
  const [annee, mois, jour] = iso.split("-").map(Number);
  const nomMois = MOIS[mois - 1];
  if (!annee || !jour || !nomMois) return iso;
  return `${jour === 1 ? "1er" : jour} ${nomMois} ${annee}`;
}

export type Categorie = (typeof CATEGORIES)[number];

/** Nom d'une catégorie tel qu'on l'affiche. Le type Record oblige à compléter cette liste si le schéma s'agrandit. */
export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  identite: "Identité",
  "etat-civil": "État civil",
  famille: "Famille",
  entreprise: "Entreprise",
  transport: "Transport",
  education: "Éducation",
  travail: "Travail",
  sante: "Santé",
  logement: "Logement",
  justice: "Justice",
  fiscalite: "Fiscalité",
  autre: "Autre",
};

export function libelleCategorie(categorie: Categorie): string {
  return LIBELLES_CATEGORIES[categorie];
}

export type StatutAffichage = {
  type: "verifie" | "perimee" | "brouillon";
  libelle: string;
};

/**
 * Pastille de confiance d'une fiche. « Vérifié » n'apparaît que pour une fiche réellement vérifiée,
 * avec sa vraie date : un brouillon n'affiche jamais de date de vérification.
 */
export function statutAffichage(
  fiche: Pick<Fiche, "statut" | "verifie_le">,
  now: Date = new Date(),
): StatutAffichage {
  if (fiche.statut !== "verifie" || !fiche.verifie_le) {
    return { type: "brouillon", libelle: "Brouillon, pas encore vérifiée" };
  }
  if (estPerimee(fiche.verifie_le, now)) {
    return { type: "perimee", libelle: "Vérifié il y a plus d’un an" };
  }
  return { type: "verifie", libelle: `Vérifié le ${formaterDate(fiche.verifie_le)}` };
}

/**
 * La fiche telle qu'on la montre : apostrophes typographiques dans tous les textes affichés. Le sens ne
 * change pas ; les adresses, les mots-clés de la recherche et l'identifiant restent tels quels.
 */
export function fichePourAffichage(fiche: Fiche): Fiche {
  const texteOuNull = (valeur: string | null) => (valeur === null ? null : typographie(valeur));
  return {
    ...fiche,
    titre: typographie(fiche.titre),
    resume: typographie(fiche.resume),
    pieces: fiche.pieces.map(typographie),
    etapes: fiche.etapes.map(typographie),
    cout: texteOuNull(fiche.cout),
    delai: texteOuNull(fiche.delai),
    lieu: texteOuNull(fiche.lieu),
    sources: fiche.sources.map((source) => ({ ...source, titre: typographie(source.titre) })),
    corps: typographie(fiche.corps),
  };
}

/** Fiches montrables aux utilisateurs : les vérifiées, plus les brouillons si on les autorise (développement). */
export function filtrerAffichables<T extends Pick<Fiche, "statut">>(fiches: T[], inclureBrouillons: boolean): T[] {
  return inclureBrouillons ? fiches : fiches.filter((fiche) => fiche.statut === "verifie");
}

/** « Un jour » devient « un jour » après un séparateur ; un sigle (« SMS sous 3 jours ») reste intact. */
function minusculeInitiale(texte: string): string {
  return /^\p{Lu}\p{Ll}/u.test(texte) ? texte.charAt(0).toLowerCase() + texte.slice(1) : texte;
}

/** Ligne d'information d'une carte de la liste : le coût et le délai de la fiche, sans rien deviner. */
export function resumeCoutDelai(fiche: Pick<Fiche, "cout" | "delai">): string {
  const { cout, delai } = fiche;
  if (cout === null) return delai === null ? "Coût et délai non précisés" : `Coût non précisé · ${delai}`;
  return delai === null ? `${cout} · délai non précisé` : `${cout} · ${minusculeInitiale(delai)}`;
}

/** Les notes de la fiche : une par puce du texte libre (le reste du texte n'est pas affiché). */
export function notesDeLaFiche(corps: string): string[] {
  return corps
    .split(/\r?\n/)
    .map((ligne) => ligne.match(/^\s*[-*]\s+(.*\S)\s*$/))
    .filter((trouve): trouve is RegExpMatchArray => trouve !== null)
    .map((trouve) => trouve[1]);
}

/** Vrai si le texte contient la mention « à confirmer » (convention des fiches pour une information incertaine). */
export function estAConfirmer(texte: string): boolean {
  return /\ba confirmer\b/.test(simplifier(texte));
}

export type PieceAffichee = {
  principal: string;
  /** Ce qui est entre parenthèses à la fin de la pièce, affiché en plus petit. */
  precision: string | null;
  aConfirmer: boolean;
};

/** Sépare une pièce de sa précision finale entre parenthèses et repère les pièces « à confirmer ». */
export function decouperPiece(texte: string): PieceAffichee {
  const trouve = texte.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!trouve || !trouve[1]) return { principal: texte, precision: null, aConfirmer: estAConfirmer(texte) };
  return { principal: trouve[1], precision: trouve[2], aConfirmer: estAConfirmer(trouve[2]) };
}

export type Source = Fiche["sources"][number];

/** « https://www.exemple.sn/page » devient « exemple.sn ». Un texte qui n'est pas une adresse est rendu tel quel. */
export function domaine(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Ligne de résumé des sources : les domaines et, si toutes les sources ont été consultées le même
 * jour, cette date. Quand les dates diffèrent, elles restent visibles dans la liste détaillée.
 */
export function resumeSources(sources: Source[]): { titre: string; detail: string } {
  const domaines = [...new Set(sources.map((source) => domaine(source.url)))];
  const dates = [...new Set(sources.map((source) => source.consulte_le))];
  const plusieurs = sources.length > 1;
  return {
    titre: plusieurs ? "Sources officielles" : "Source officielle",
    detail:
      dates.length === 1
        ? `${domaines.join(", ")}, ${plusieurs ? "consultées" : "consultée"} le ${formaterDate(dates[0])}`
        : domaines.join(", "),
  };
}

export type SegmentTexte =
  | { type: "texte"; valeur: string }
  | { type: "tel"; valeur: string; href: string };

/**
 * Repère un numéro vert (« numéro vert 800 00 2012 ») pour en faire un lien d'appel. On ne cherche que
 * les numéros annoncés comme tels : un montant (« 10 000 FCFA ») ne doit jamais devenir un lien.
 */
export function decouperTelephones(texte: string): SegmentTexte[] {
  const segments: SegmentTexte[] = [];
  let fin = 0;
  for (const trouve of texte.matchAll(/(num[eé]ro vert\s*:?\s*)(\+?\d[\d .]{5,}\d)/gi)) {
    const debutNumero = (trouve.index ?? 0) + trouve[1].length;
    if (debutNumero > fin) segments.push({ type: "texte", valeur: texte.slice(fin, debutNumero) });
    segments.push({ type: "tel", valeur: trouve[2], href: `tel:${trouve[2].replace(/[^\d+]/g, "")}` });
    fin = debutNumero + trouve[2].length;
  }
  if (fin < texte.length || segments.length === 0) segments.push({ type: "texte", valeur: texte.slice(fin) });
  return segments;
}

/** Les brouillons ne répondent qu'en développement (DEMARCHE_INCLUDE_DRAFTS=true), jamais en production. */
export function brouillonsAutorises(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMARCHE_INCLUDE_DRAFTS === "true";
}
