// L'apparition progressive de la réponse : les blocs de l'écran portent `data-apparition="groupe"` et sont cachés par
// le CSS tant qu'ils n'ont pas `data-visible` (globals.css). Quand la voix lit, chaque groupe se montre au moment où
// elle y arrive (le repère de la phrase en cours, voir parleur.ts) ; sinon, les groupes se suivent en cascade.
// Ici, seulement la logique pure ; le composant Apparition.tsx pose les attributs dans le navigateur.

/** Les groupes de l'écran de réponse, dans leur ordre d'apparition. */
export const GROUPES_APPARITION = ["entete", "intro", "faits", "a-confirmer", "pieces", "etapes", "sources", "suite"] as const;
export type GroupeApparition = (typeof GROUPES_APPARITION)[number];

/** Le groupe d'un bloc de la page. */
export const ATTRIBUT_GROUPE = "data-apparition";
/** Posé sur un bloc quand il est montré. */
export const ATTRIBUT_VISIBLE = "data-visible";

/** Les repères vocaux (voir lecture.ts) et le groupe de l'écran qu'ils concernent. */
const GROUPE_DU_REPERE: Readonly<Record<string, GroupeApparition>> = {
  statut: "entete",
  titre: "entete",
  intro: "intro",
  cout: "faits",
  delai: "faits",
  lieu: "faits",
  "a-confirmer": "a-confirmer",
  pieces: "pieces",
  etapes: "etapes",
};

/** Une pièce (« piece-0 », « piece-12 ») : la voix les lit une à une, elles sont dans le groupe des pièces. */
const REPERE_PIECE = /^piece-\d+$/;

/** Le groupe d'un repère vocal ; `null` si inconnu. */
export function groupeDeLaCible(cible: string | null): GroupeApparition | null {
  if (cible === null) return null;
  if (REPERE_PIECE.test(cible)) return "pieces";
  return Object.hasOwn(GROUPE_DU_REPERE, cible) ? GROUPE_DU_REPERE[cible] : null;
}

/** Les groupes à montrer quand la voix lit ce repère : tous ceux qui précèdent, et le sien. `[]` si inconnu. */
export function groupesJusquA(cible: string | null): GroupeApparition[] {
  const groupe = groupeDeLaCible(cible);
  if (groupe === null) return [];
  return GROUPES_APPARITION.slice(0, GROUPES_APPARITION.indexOf(groupe) + 1);
}

/** Le plan d'une cascade : chaque groupe restant avec son délai, espacés de `pasMs`, le premier tout de suite. */
export function planCascade(
  dejaMontres: ReadonlySet<GroupeApparition>,
  pasMs: number,
): { groupe: GroupeApparition; delaiMs: number }[] {
  return GROUPES_APPARITION.filter((groupe) => !dejaMontres.has(groupe)).map((groupe, index) => ({
    groupe,
    delaiMs: index * pasMs,
  }));
}

/** La page, ou une partie de la page (`document` dans le navigateur). */
export type RacineApparition = {
  querySelectorAll(selecteur: string): ArrayLike<{ setAttribute(nom: string, valeur: string): void }>;
};

/** Pose `data-visible` sur tous les blocs du groupe sous `racine`. Rend le nombre de blocs touchés. */
export function montrer(racine: RacineApparition, groupe: GroupeApparition): number {
  // Seuls les groupes de la liste passent dans un sélecteur (même garde-fou que le surlignage).
  if (!GROUPES_APPARITION.includes(groupe)) return 0;
  const blocs = Array.from(racine.querySelectorAll(`[${ATTRIBUT_GROUPE}="${groupe}"]`));
  for (const bloc of blocs) bloc.setAttribute(ATTRIBUT_VISIBLE, "");
  return blocs.length;
}
