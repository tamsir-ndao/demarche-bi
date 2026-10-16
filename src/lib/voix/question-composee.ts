import { LONGUEUR_MAX_QUESTION } from "../texte";

// Sur un écran de précision, la personne répond à voix haute à une question déjà posée (« je veux une pièce
// d'identité » puis « la première ») : les deux sont réunies en une seule question, relue avant l'envoi.

/** Signe qui termine déjà une phrase : on n'ajoute pas de point derrière. */
const FIN_DE_PHRASE = /[.?!]$/;

/** Le signe qui remplace la fin d'un préfixe raccourci. */
const POINTS = "…";

function normaliser(texte: string): string {
  return texte.replace(/\s+/g, " ").trim();
}

/** Les caractères visibles (un emoji compte pour un), comme la coupe du serveur dans nettoyerQuestion. */
function longueur(texte: string): number {
  return Array.from(texte).length;
}

function couper(texte: string, maximum: number): string {
  return Array.from(texte).slice(0, Math.max(0, maximum)).join("");
}

/**
 * Raccourcit le préfixe par la fin pour tenir dans `budget` caractères, « … » compris : on coupe sur un espace
 * quand il y en a un (pas de mot tronqué) et on retire la ponctuation qui resterait collée aux points.
 */
function raccourcir(prefixe: string, budget: number): string {
  let debut = couper(prefixe, budget - POINTS.length);
  const dernierEspace = debut.lastIndexOf(" ");
  if (dernierEspace > 0) debut = debut.slice(0, dernierEspace);
  return debut.replace(/[\s.,;:!?]+$/, "") + POINTS;
}

/**
 * La question complète à partir de ce qui était déjà posé (`prefixe`, absent sur l'accueil) et de ce que la personne
 * vient de dire (`dit`). Le préfixe est terminé par un point s'il ne finit pas par « . », « ? » ou « ! », les espaces
 * sont normalisés, et le tout tient dans LONGUEUR_MAX_QUESTION : si c'est trop long, c'est le préfixe qui est
 * raccourci par la fin (avec « … »), jamais ce que la personne vient de dire, qui compte plus.
 */
export function composerLaQuestion(prefixe: string | undefined, dit: string): string {
  const reponse = normaliser(dit);
  const avant = normaliser(prefixe ?? "");
  if (avant === "") return couper(reponse, LONGUEUR_MAX_QUESTION);

  const phrase = FIN_DE_PHRASE.test(avant) ? avant : `${avant}.`;
  const entier = `${phrase} ${reponse}`;
  if (longueur(entier) <= LONGUEUR_MAX_QUESTION) return entier;

  // Trop long : la place qui reste pour le préfixe, une fois la réponse et l'espace comptés.
  const budget = LONGUEUR_MAX_QUESTION - longueur(reponse) - 1;
  // Pas même la place d'un mot et des points : la réponse seule (coupée si elle dépasse à elle seule la limite).
  if (budget < POINTS.length + 1) return couper(reponse, LONGUEUR_MAX_QUESTION);
  return `${raccourcir(phrase, budget)} ${reponse}`;
}
