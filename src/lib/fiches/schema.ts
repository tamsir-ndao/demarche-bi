import { z } from "zod";

// Messages d'erreur de Zod en français (utiles aux contributeurs).
z.config(z.locales.fr());

/** Champ texte obligatoire mais pouvant valoir null (cout, delai, lieu). */
const texteOuNull = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? "Champ obligatoire : mets null si tu ne peux pas confirmer l'information"
        : "Texte ou null attendu",
  })
  .min(2, "Texte trop court (mets null si tu ne sais pas)")
  .nullable();

/** Catégories autorisées pour une fiche. Ajoutes-en une ici si nécessaire (via une PR). */
export const CATEGORIES = [
  "identite",
  "etat-civil",
  "famille",
  "entreprise",
  "transport",
  "education",
  "travail",
  "sante",
  "logement",
  "justice",
  "fiscalite",
  "autre",
] as const;

// Le YAML transforme une date non guillemetée (2026-10-09) en objet Date : on la remet en texte.
const isoDate = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide"),
);

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const SourceSchema = z.object({
  titre: z.string().min(3, "Titre de la source trop court"),
  url: z.string().refine(isHttpsUrl, "URL https:// valide attendue"),
  consulte_le: isoDate,
});

/**
 * En-tête (frontmatter) d'une fiche. Les champs cout, delai et lieu sont OBLIGATOIRES
 * mais peuvent valoir null : mieux vaut un null honnête qu'une information approximative.
 */
export const FicheSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug en minuscules, chiffres et tirets uniquement"),
    titre: z.string().min(5).max(120),
    categorie: z.enum(CATEGORIES, {
      error: `Catégorie inconnue. Valeurs possibles : ${CATEGORIES.join(", ")}`,
    }),
    resume: z.string().min(20, "Résumé trop court (20 caractères minimum)").max(300),
    mots_cles: z
      .array(z.string().min(2, "Mot-clé trop court"))
      .min(3, "Au moins 3 mots-clés")
      .max(20),
    pieces: z.array(z.string().min(2, "Pièce trop courte")).default([]),
    etapes: z.array(z.string().min(3, "Étape trop courte")).min(1, "Au moins une étape"),
    cout: texteOuNull,
    delai: texteOuNull,
    lieu: texteOuNull,
    sources: z.array(SourceSchema).min(1, "Au moins une source officielle"),
    statut: z.enum(["brouillon", "verifie"]),
    verifie_le: isoDate.nullable(),
    verifie_par: z.string().min(2).nullable(),
  })
  .superRefine((fiche, ctx) => {
    if (fiche.statut === "verifie") {
      if (!fiche.verifie_le) {
        ctx.addIssue({
          code: "custom",
          path: ["verifie_le"],
          message: "Obligatoire quand statut = verifie",
        });
      }
      if (!fiche.verifie_par) {
        ctx.addIssue({
          code: "custom",
          path: ["verifie_par"],
          message: "Obligatoire quand statut = verifie (ton pseudo GitHub)",
        });
      }
    }
  });

export type FicheData = z.infer<typeof FicheSchema>;
export type Fiche = FicheData & { corps: string };

/** Vrai si la dernière vérification date de plus de `mois` mois (ou n'existe pas). */
export function estPerimee(
  verifieLe: string | null,
  now: Date = new Date(),
  mois = 12,
): boolean {
  if (!verifieLe) return true;
  const limite = new Date(verifieLe);
  limite.setMonth(limite.getMonth() + mois);
  return limite < now;
}
