import { z } from "zod";
import { LONGUEUR_MAX_COMMENTAIRE } from "../texte";

// Ce que POST /api/feedback accepte : { "journalId": "uuid", "utile": true, "commentaire": "…" } (commentaire facultatif).
// « journalId » est l'identifiant de la réponse que la personne vient de lire (voir journal.ts).

export type Avis = { journalId: string; utile: boolean; commentaire: string | null };

export type LectureAvis = { ok: true; avis: Avis } | { ok: false };

const CorpsDeLAvis = z.object({
  journalId: z.uuid(),
  utile: z.boolean(),
  commentaire: z.string().nullish(),
});

/** Le commentaire sur une ligne, coupé à la limite de la base sans casser un emoji ; `null` s'il est vide. */
function nettoyerCommentaire(texte: string | null | undefined): string | null {
  const surUneLigne = (texte ?? "").replace(/\s+/g, " ").trim();
  const coupe = Array.from(surUneLigne).slice(0, LONGUEUR_MAX_COMMENTAIRE).join("").trim();
  return coupe === "" ? null : coupe;
}

/** Lit le corps JSON d'un avis : tout ce qui n'est pas du bon type est refusé, les champs en trop sont ignorés. */
export function lireAvis(corps: unknown): LectureAvis {
  const lu = CorpsDeLAvis.safeParse(corps);
  if (!lu.success) return { ok: false };
  const { journalId, utile, commentaire } = lu.data;
  return { ok: true, avis: { journalId, utile, commentaire: nettoyerCommentaire(commentaire) } };
}
