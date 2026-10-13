import { createHash, timingSafeEqual } from "node:crypto";
import type { Requete } from "./journal";

// La purge du journal : les questions et les avis de plus de 90 jours sont supprimés (la durée annoncée dans
// docs/ARCHITECTURE.md, « Données »). Elle est lancée chaque nuit par une tâche planifiée de Vercel (vercel.json)
// qui appelle GET /api/cron/purge avec le secret CRON_SECRET. Serveur uniquement.

export const DUREE_CONSERVATION_JOURS = 90;

const JOUR_MS = 24 * 60 * 60 * 1000;

export type ResultatPurge = { ok: true; reponses: number; avis: number } | { ok: false };

type DependancesPurge = {
  requete: Requete;
  /** Garde une trace d'une panne de la base (le serveur n'y met que la nature de la panne). */
  signaler?: (etape: "avis" | "reponses", erreur: unknown) => void;
  /** L'heure actuelle en millisecondes (les tests la fixent). */
  maintenant?: () => number;
};

/** Supprime ce qui est antérieur à `$1` et rend le nombre de lignes supprimées. */
const supprimer = (table: "feedback" | "question_logs") =>
  `with supprimees as (delete from ${table} where created_at < $1 returning 1) select count(*)::int as n from supprimees`;

/** Le nombre rendu par la base, ou zéro si la réponse n'a pas la forme prévue. */
function compte(lignes: unknown): number {
  const premiere = Array.isArray(lignes) ? (lignes[0] as { n?: unknown } | undefined) : undefined;
  return typeof premiere?.n === "number" ? premiere.n : 0;
}

export function creerPurge({ requete, signaler, maintenant = Date.now }: DependancesPurge) {
  return {
    /** Ne lève jamais d'erreur : une panne de la base donne `{ ok: false }`. */
    async purger(): Promise<ResultatPurge> {
      const limite = new Date(maintenant() - DUREE_CONSERVATION_JOURS * JOUR_MS).toISOString();
      // Les avis d'abord : un avis resté sans réponse rattachée n'est pas supprimé avec elle.
      let avis: number;
      try {
        avis = compte(await requete(supprimer("feedback"), [limite]));
      } catch (erreur) {
        signaler?.("avis", erreur);
        return { ok: false };
      }
      try {
        return { ok: true, reponses: compte(await requete(supprimer("question_logs"), [limite])), avis };
      } catch (erreur) {
        signaler?.("reponses", erreur);
        return { ok: false };
      }
    },
  };
}

/** Une empreinte de taille fixe : on compare deux empreintes, la durée de la comparaison ne dit rien du secret. */
function empreinte(texte: string): Buffer {
  return createHash("sha256").update(texte).digest();
}

/**
 * Vrai si la demande porte `Authorization: Bearer <secret>` : c'est ce qu'envoie Vercel à sa tâche planifiée quand la
 * variable CRON_SECRET existe. Sans secret réglé, personne n'est autorisé.
 */
export function autoriserLaPurge(enTete: string | null | undefined, secret: string | undefined): boolean {
  if (!secret) return false;
  return timingSafeEqual(empreinte(enTete ?? ""), empreinte(`Bearer ${secret}`));
}
