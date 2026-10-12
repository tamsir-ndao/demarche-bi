import { nettoyerQuestion } from "../texte";
import { lireAudio, TAILLE_MAX_AUDIO_OCTETS } from "../voix/audio";
import type { CodeErreurServeur } from "../voix/codes";
import { texteDeSilence } from "../voix/silence";
import { ErreurIA } from "./client";
import { visiteurDepuis } from "./service";

// Ce que fait la route /api/transcribe : contrôler l'enregistrement reçu, limiter les envois par visiteur, le faire
// transcrire par Whisper, rendre le texte. Le fichier audio n'est jamais enregistré : il reste en mémoire le temps
// de la requête. Le texte et l'adresse du visiteur ne sont pas gardés non plus.

export type ResultatTranscription =
  | { ok: true; texte: string }
  | { ok: false; code: CodeErreurServeur; statut: number };

export type DependancesTranscriptionService = {
  /** Envoie l'enregistrement à Whisper et rend le texte (le vrai appel, ou un faux dans les tests). */
  transcrire: (audio: Blob, options: { nomFichier: string }) => Promise<string>;
  limiteur: { autoriser(visiteur: string): boolean };
  /** Garde une trace d'une panne de Whisper (jamais le texte ni la clé). */
  signaler?: (erreur: unknown) => void;
};

const STATUTS: Record<CodeErreurServeur, number> = {
  audio_manquant: 400,
  audio_vide: 400,
  audio_trop_gros: 413,
  format_non_pris_en_charge: 415,
  trop_de_demandes: 429,
  service_sature: 503,
  service_indisponible: 503,
};

/** Place laissée au formulaire autour du fichier (en-têtes multipart) quand on juge la taille annoncée. */
const MARGE_FORMULAIRE_OCTETS = 64 * 1024;

const echec = (code: CodeErreurServeur): ResultatTranscription => ({ ok: false, code, statut: STATUTS[code] });

export function creerServiceTranscription({ transcrire, limiteur, signaler }: DependancesTranscriptionService) {
  return {
    /** Traite une demande POST /api/transcribe : un formulaire dont le champ « audio » est l'enregistrement. */
    async traiter(demande: Request): Promise<ResultatTranscription> {
      // Une taille annoncée trop grande est refusée sans lire le contenu.
      const annoncee = Number(demande.headers.get("content-length"));
      if (annoncee > TAILLE_MAX_AUDIO_OCTETS + MARGE_FORMULAIRE_OCTETS) return echec("audio_trop_gros");

      const formulaire = await demande.formData().catch(() => undefined);
      const audio = lireAudio(formulaire?.get("audio"));
      if (!audio.ok) return echec(audio.code);

      const visiteur = visiteurDepuis(demande.headers);
      if (visiteur !== undefined && !limiteur.autoriser(visiteur)) return echec("trop_de_demandes");

      try {
        const texte = nettoyerQuestion(await transcrire(audio.audio, { nomFichier: audio.nomFichier }));
        // Une phrase inventée sur du silence vaut « rien entendu » : le texte vide.
        return { ok: true, texte: texteDeSilence(texte) ? "" : texte };
      } catch (erreur) {
        signaler?.(erreur);
        return echec(erreur instanceof ErreurIA && erreur.nature === "saturee" ? "service_sature" : "service_indisponible");
      }
    },
  };
}
