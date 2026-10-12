// Ce que le site accepte comme enregistrement de la voix : un fichier audio court, dans un format que Whisper lit.
// Sans dépendance : le serveur contrôle le fichier reçu, le navigateur s'en sert pour limiter la durée.

import type { CodeErreurServeur } from "./codes";

/** Durée maximale d'un enregistrement : une question de 300 caractères se dit en 25 secondes environ. */
export const DUREE_MAX_ENREGISTREMENT_S = 30;

/** Taille maximale du fichier reçu (30 secondes de voix pèsent moins de 1 Mo ; Vercel plafonne à 4,5 Mo). */
export const TAILLE_MAX_AUDIO_OCTETS = 2 * 1024 * 1024;

/** Les formats que les navigateurs enregistrent (Chrome et Firefox : webm ou ogg, Safari : mp4) et que Whisper lit. */
const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

/** L'extension de fichier d'un type audio (« audio/webm;codecs=opus » donne « webm »), ou rien si Whisper ne le lit pas. */
export function extensionAudio(type: string): string | undefined {
  return EXTENSIONS[type.split(";")[0].trim().toLowerCase()];
}

export type CodeErreurAudio = Extract<
  CodeErreurServeur,
  "audio_manquant" | "audio_vide" | "audio_trop_gros" | "format_non_pris_en_charge"
>;

export type AudioLu = { ok: true; audio: Blob; nomFichier: string } | { ok: false; code: CodeErreurAudio };

/** Contrôle le champ « audio » d'un formulaire reçu : un vrai fichier, non vide, pas trop gros, dans un format lisible. */
export function lireAudio(valeur: FormDataEntryValue | null | undefined): AudioLu {
  if (!(valeur instanceof Blob)) return { ok: false, code: "audio_manquant" };
  if (valeur.size === 0) return { ok: false, code: "audio_vide" };
  if (valeur.size > TAILLE_MAX_AUDIO_OCTETS) return { ok: false, code: "audio_trop_gros" };
  const extension = extensionAudio(valeur.type);
  if (extension === undefined) return { ok: false, code: "format_non_pris_en_charge" };
  return { ok: true, audio: valeur, nomFichier: `audio.${extension}` };
}
