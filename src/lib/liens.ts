// Liens vers le dépôt public : c'est là qu'on propose une démarche ou qu'on corrige une fiche.
export const REPO_URL = "https://github.com/tamsir-ndao/demarche-bi";

export const URL_CONTRIBUER = `${REPO_URL}/blob/main/CONTRIBUTING.md`;

export const URL_SIGNALER = `${REPO_URL}/issues/new/choose`;

/** Ouvre l'éditeur GitHub directement sur le fichier de la fiche. */
export function urlCorrectionFiche(slug: string): string {
  return `${REPO_URL}/edit/main/content/demarches/${slug}.md`;
}
