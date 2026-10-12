// Sur du silence ou un bruit faible, Whisper n'écrit pas « rien » : il invente une phrase (mesuré le 11 octobre 2026 avec
// whisper-large-v3-turbo : « Sous-titrage Société Radio-Canada » sur du silence, « Merci. » sur un bruit faible, avec une
// probabilité d'absence de parole à 0, donc impossible à repérer par ses propres indices). Le navigateur n'envoie déjà
// pas un enregistrement sans voix ; ce filtre rattrape les phrases inventées les plus courantes.

import { simplifier } from "../texte";

const PHRASES_INVENTEES = new Set([
  "merci",
  "merci beaucoup",
  "merci a tous",
  "merci d avoir regarde",
  "merci d avoir regarde cette video",
  "merci d avoir regarde la video",
  "a bientot",
  "a la prochaine",
]);

/** Vrai quand le texte rendu par Whisper est une phrase qu'il invente sur du silence, et non une question. */
export function texteDeSilence(texte: string): boolean {
  const normalise = simplifier(texte)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return normalise.startsWith("sous titr") || PHRASES_INVENTEES.has(normalise);
}
