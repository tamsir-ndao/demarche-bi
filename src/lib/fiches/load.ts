import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { FicheSchema, type Fiche } from "./schema";

// Schéma JSON : une date non guillemetée reste un texte. Avec le schéma par défaut, le YAML
// la convertit en date et corrige silencieusement les erreurs (2026-13-45 devient 2027-02-14).
const YAML_ENGINE = {
  parse: (source: string) => (yaml.load(source, { schema: yaml.JSON_SCHEMA }) ?? {}) as object,
};

export type LoadResult = { fiches: Fiche[]; errors: string[] };

export const FICHES_DIR = path.join(process.cwd(), "content", "demarches");

/**
 * Lit et valide toutes les fiches d'un dossier (serveur uniquement).
 * Les fichiers dont le nom commence par « _ » (ex. _modele.md) sont ignorés.
 * Ne lève pas d'exception : les problèmes sont renvoyés dans `errors`.
 */
export function loadFiches(dir: string = FICHES_DIR): LoadResult {
  const fiches: Fiche[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(dir)) {
    return { fiches, errors: [`Dossier introuvable : ${dir}`] };
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();

  const seen = new Set<string>();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw, { engines: { yaml: YAML_ENGINE } });
    } catch (err) {
      const reason = err instanceof Error ? err.message.split("\n")[0] : "erreur inconnue";
      errors.push(
        `${file} : en-tête YAML illisible (${reason}). Astuce : entoure de guillemets "..." tout texte qui contient « : » ou qui commence par un caractère spécial ; la ligne indiquée est celle du fichier.`,
      );
      continue;
    }

    const result = FicheSchema.safeParse(parsed.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path.length ? issue.path.join(".") : "(fiche)";
        errors.push(`${file} : ${field} — ${issue.message}`);
      }
      continue;
    }

    const fiche = result.data;
    const expectedSlug = file.replace(/\.md$/, "");
    if (fiche.slug !== expectedSlug) {
      errors.push(`${file} : slug « ${fiche.slug} » différent du nom du fichier « ${expectedSlug} »`);
      continue;
    }
    if (seen.has(fiche.slug)) {
      errors.push(`${file} : slug « ${fiche.slug} » en double`);
      continue;
    }
    seen.add(fiche.slug);

    fiches.push({ ...fiche, corps: parsed.content.trim() });
  }

  return { fiches, errors };
}
