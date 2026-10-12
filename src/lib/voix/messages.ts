import type { CodeErreurVoix } from "./codes";

// Ce que la personne lit quand la voix ne marche pas : tutoiement, phrases courtes, pas de jargon,
// et toujours la suite à donner (écrire sa question, ou réessayer).

export type ErreurAffichee = {
  message: string;
  /** Faux quand réessayer ne servirait à rien (le navigateur ne sait pas faire, il n'y a pas de micro). */
  peutReessayer: boolean;
};

const ERREURS: Record<CodeErreurVoix, ErreurAffichee> = {
  micro_refuse: {
    message: "Je n’ai pas accès à ton micro. Autorise-le dans ton navigateur, puis réessaie.",
    peutReessayer: true,
  },
  micro_introuvable: { message: "Je ne trouve pas de micro sur ton appareil. Écris ta question.", peutReessayer: false },
  micro_inaccessible: {
    message: "Je n’arrive pas à utiliser ton micro. Ferme les applications qui l’utilisent, puis réessaie.",
    peutReessayer: true,
  },
  voix_indisponible: { message: "Ton navigateur ne peut pas enregistrer ta voix. Écris ta question.", peutReessayer: false },
  rien_entendu: { message: "Je n’ai rien entendu. Parle plus près du micro, puis réessaie.", peutReessayer: true },
  reseau: { message: "Pas de connexion. Vérifie ton réseau, puis réessaie.", peutReessayer: true },
  audio_manquant: { message: "Ta voix n’est pas arrivée jusqu’à moi. Réessaie.", peutReessayer: true },
  audio_vide: { message: "Ta voix n’est pas arrivée jusqu’à moi. Réessaie.", peutReessayer: true },
  audio_trop_gros: { message: "Ton message est trop long. Dis ta question en une phrase.", peutReessayer: true },
  format_non_pris_en_charge: {
    message: "Ton navigateur n’envoie pas un son que je comprends. Écris ta question.",
    peutReessayer: false,
  },
  trop_de_demandes: { message: "Tu vas un peu vite. Attends une minute, puis réessaie.", peutReessayer: true },
  service_sature: {
    message: "Beaucoup de monde utilise la voix en ce moment. Écris ta question ou réessaie plus tard.",
    peutReessayer: true,
  },
  service_indisponible: { message: "La voix ne marche pas pour l’instant. Écris ta question.", peutReessayer: true },
};

export function erreurDeVoix(code: CodeErreurVoix): ErreurAffichee {
  return ERREURS[code];
}
