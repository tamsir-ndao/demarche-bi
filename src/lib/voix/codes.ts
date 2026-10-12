// Les erreurs possibles de la voix. Les premières viennent de la route /api/transcribe (le navigateur les relit),
// les autres du navigateur lui-même. Les messages montrés à la personne sont dans messages.ts.

export const CODES_ERREUR_SERVEUR = [
  "audio_manquant",
  "audio_vide",
  "audio_trop_gros",
  "format_non_pris_en_charge",
  "trop_de_demandes",
  "service_sature",
  "service_indisponible",
] as const;

export type CodeErreurServeur = (typeof CODES_ERREUR_SERVEUR)[number];

const CODES_ERREUR_NAVIGATEUR = [
  "micro_refuse",
  "micro_introuvable",
  "micro_inaccessible",
  "voix_indisponible",
  "rien_entendu",
  "reseau",
] as const;

export const CODES_ERREUR_VOIX = [...CODES_ERREUR_SERVEUR, ...CODES_ERREUR_NAVIGATEUR] as const;

export type CodeErreurVoix = (typeof CODES_ERREUR_VOIX)[number];

export function estCodeServeur(valeur: unknown): valeur is CodeErreurServeur {
  return (CODES_ERREUR_SERVEUR as readonly unknown[]).includes(valeur);
}
