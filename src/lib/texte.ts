// Petits outils de texte, sans dépendance : ils servent aussi bien au serveur qu'au navigateur
// (par exemple pour filtrer la liste des démarches), sans embarquer le schéma des fiches.

/** Minuscules, sans accents (« œ » devient « oe ») : pour comparer des textes. */
export function simplifier(texte: string): string {
  return texte.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/œ/g, "oe");
}

/** Longueur maximale d'une question : le champ de saisie et le serveur appliquent la même limite. */
export const LONGUEUR_MAX_QUESTION = 300;

/**
 * Lit la question dans l'adresse (?q=…), qui peut être absente, répétée ou très longue :
 * une seule valeur, sur une ligne, coupée à 300 caractères sans casser un emoji.
 */
export function nettoyerQuestion(valeur: string | string[] | undefined): string {
  const texte = Array.isArray(valeur) ? valeur[0] : valeur;
  const surUneLigne = (texte ?? "").replace(/\s+/g, " ").trim();
  return Array.from(surUneLigne).slice(0, LONGUEUR_MAX_QUESTION).join("").trim();
}

/**
 * Les mots d'un texte tapé dans un champ de filtre : sans accents, au singulier (« cartes » trouve
 * « carte »), sans lettres isolées. Même règle de pluriel que la recherche des fiches.
 */
export function motsDeFiltre(texte: string): string[] {
  return simplifier(texte)
    .split(/[^a-z0-9]+/)
    .filter((mot) => mot.length >= 2)
    .map((mot) => (mot.length > 3 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot));
}

/**
 * Apostrophe droite des fiches (« d'identité ») en apostrophe typographique (« d’identité »), comme
 * dans le reste de l'interface. Seules les apostrophes collées à des lettres ou des chiffres changent.
 */
export function typographie(texte: string): string {
  return texte.replace(/(?<=\p{L})'(?=[\p{L}\p{N}])/gu, "’");
}
