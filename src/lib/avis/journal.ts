import type { Reponse } from "../ai/ask";
import { LONGUEUR_MAX_COMMENTAIRE } from "../texte";
import { masquerDonneesPersonnelles } from "./anonymiser";
import type { Avis } from "./avis";

// Le journal anonyme (tables question_logs et feedback, db/migrations/0001_init.sql). Il garde la question (sur une
// ligne, 500 caractères au plus), si le site a su répondre, la fiche montrée et l'avis de la personne. Jamais d'adresse,
// de compte, d'identifiant de visiteur ni de voix. La question et le commentaire passent par le masque de anonymiser.ts
// (e-mails, téléphones, numéros longs) avant d'être écrits : ce sont les deux seuls textes libres envoyés à la base.
// Le journal est facultatif : sans base, ou si la base tombe, le site répond comme avant et rien ne remonte à la personne.

/** La base refuse une question plus longue (db/migrations/0001_init.sql). */
export const LONGUEUR_MAX_QUESTION_JOURNAL = 500;

/** Une requête SQL avec ses valeurs (`$1`, `$2`…) : la vraie base, ou une fausse dans les tests. */
export type Requete = (texte: string, valeurs: readonly unknown[]) => Promise<unknown>;

export type EntreeJournal = {
  question: string;
  /** Faux quand le site a répondu « je ne sais pas encore ». */
  repondue: boolean;
  fiches: string[];
};

/**
 * Ce que le journal garde d'une réponse. Seules les réponses finales comptent : une question de précision attend
 * la suite, et la réponse choisie ensuite est notée avec la même question.
 */
export function entreeDeLaReponse(question: string, reponse: Reponse): EntreeJournal | null {
  switch (reponse.type) {
    case "fiche":
      return { question, repondue: true, fiches: [reponse.fiche.slug] };
    case "inconnue":
    case "hors_domaine":
    case "interdit":
    case "salutation":
      return { question, repondue: false, fiches: [] };
    case "precision":
    case "precision_generale":
      return null;
  }
}

export type Journal = {
  /** Vrai si la ligne est écrite. Ne lève jamais d'erreur. */
  noterReponse(id: string, entree: EntreeJournal): Promise<boolean>;
  /** Vrai si l'avis est écrit. Ne lève jamais d'erreur. */
  noterAvis(avis: Avis): Promise<boolean>;
};

type DependancesJournal = {
  requete: Requete;
  /** Garde une trace d'une panne de la base (le serveur n'y met ni la question ni l'adresse de la base). */
  signaler?: (etape: "reponse" | "avis", erreur: unknown) => void;
};

export function creerJournal({ requete, signaler }: DependancesJournal): Journal {
  async function ecrire(etape: "reponse" | "avis", texte: string, valeurs: readonly unknown[]): Promise<boolean> {
    try {
      await requete(texte, valeurs);
      return true;
    } catch (erreur) {
      signaler?.(etape, erreur);
      return false;
    }
  }

  return {
    noterReponse(id, { question, repondue, fiches }) {
      // Le masque passe avant la coupe : couper d'abord laisserait le début d'un numéro, trop court pour être reconnu.
      const coupee = Array.from(masquerDonneesPersonnelles(question)).slice(0, LONGUEUR_MAX_QUESTION_JOURNAL).join("");
      return ecrire("reponse", "insert into question_logs (id, question, answered, fiche_slugs) values ($1, $2, $3, $4)", [
        id,
        coupee,
        repondue,
        fiches,
      ]);
    },
    noterAvis({ journalId, utile, commentaire }) {
      // Une étiquette (« [téléphone] ») peut être plus longue que ce qu'elle remplace : on recoupe pour que la base ne refuse pas l'avis.
      const masque =
        commentaire === null ? null : Array.from(masquerDonneesPersonnelles(commentaire)).slice(0, LONGUEUR_MAX_COMMENTAIRE).join("");
      // Le sous-select donne « rien » si la réponse n'est pas dans le journal : l'avis est alors gardé sans rattachement.
      return ecrire(
        "avis",
        "insert into feedback (question_log_id, helpful, comment) values ((select id from question_logs where id = $1), $2, $3)",
        [journalId, utile, masque],
      );
    },
  };
}
