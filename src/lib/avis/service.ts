import type { Reponse } from "../ai/ask";
import { visiteurDepuis } from "../ai/service";
import { lireAvis } from "./avis";
import { entreeDeLaReponse, type Journal } from "./journal";

// Ce que le site fait du journal : noter la réponse montrée (en arrière-plan, après l'envoi de la page) et recevoir
// l'avis de la personne (POST /api/feedback). Sans base de données (`journal` vide), rien n'est noté et la barre
// d'avis n'est pas montrée. L'adresse du visiteur sert seulement à limiter le nombre d'envois : elle n'est pas gardée.

export type CodeErreurAvis = "avis_invalide" | "trop_de_demandes" | "indisponible";

export type ResultatAvis = { ok: true } | { ok: false; code: CodeErreurAvis; statut: number };

const STATUTS: Record<CodeErreurAvis, number> = {
  avis_invalide: 400,
  trop_de_demandes: 429,
  indisponible: 503,
};

const echec = (code: CodeErreurAvis): ResultatAvis => ({ ok: false, code, statut: STATUTS[code] });

/** Un avis tient en quelques centaines de caractères : au-delà, ce n'est pas un avis. */
export const TAILLE_MAX_AVIS_OCTETS = 4096;

export type DependancesServiceAvis = {
  /** Le journal, ou `null` quand il n'y a pas de base de données. */
  journal: Journal | null;
  /** Limite les avis par visiteur. */
  limiteurAvis: { autoriser(visiteur: string): boolean };
  /** Limite les réponses notées par visiteur : recharger la même page ne doit pas remplir la base. */
  limiteurJournal: { autoriser(visiteur: string): boolean };
  /** Programme un travail pour après l'envoi de la page (`after` de Next.js). */
  apres: (travail: () => Promise<unknown>) => void;
  nouvelIdentifiant: () => string;
};

export function creerServiceAvis({ journal, limiteurAvis, limiteurJournal, apres, nouvelIdentifiant }: DependancesServiceAvis) {
  return {
    /**
     * Note la réponse montrée et rend son identifiant (pour que l'avis s'y rattache), ou `null` quand elle n'est pas
     * notée : pas de base, question de précision, ou visiteur qui recharge trop vite. L'écriture se fait après l'envoi.
     * Sans identifiant, la page n'affiche pas « Cette réponse t'a aidé ? ».
     */
    noterLaReponse(question: string, reponse: Reponse, visiteur?: string): string | null {
      const entree = entreeDeLaReponse(question, reponse);
      if (journal === null || entree === null) return null;
      if (visiteur !== undefined && !limiteurJournal.autoriser(visiteur)) return null;

      const id = nouvelIdentifiant();
      apres(() => journal.noterReponse(id, entree));
      return id;
    },

    /** Traite une demande POST /api/feedback : le corps JSON d'un avis. */
    async enregistrerLAvis(demande: Request): Promise<ResultatAvis> {
      if (journal === null) return echec("indisponible");

      const visiteur = visiteurDepuis(demande.headers);
      if (visiteur !== undefined && !limiteurAvis.autoriser(visiteur)) return echec("trop_de_demandes");

      // Une taille annoncée trop grande est refusée sans lire le contenu.
      if (Number(demande.headers.get("content-length")) > TAILLE_MAX_AVIS_OCTETS) return echec("avis_invalide");
      const texte = await demande.text().catch(() => "");
      if (texte.length > TAILLE_MAX_AVIS_OCTETS) return echec("avis_invalide");

      let corps: unknown;
      try {
        corps = JSON.parse(texte);
      } catch {
        return echec("avis_invalide");
      }
      const avis = lireAvis(corps);
      if (!avis.ok) return echec("avis_invalide");

      return (await journal.noterAvis(avis.avis)) ? { ok: true } : echec("indisponible");
    },
  };
}
