import { ErreurIA } from "../ai/client";
import { ComprehensionSchema, ReponseIASchema } from "../ai/schemas";
import type { Modele } from "../ai/structured";

// Pour l'évaluation : enveloppe un `Modele` et garde ce que le modèle a VRAIMENT écrit, avant les garde-fous. La réponse
// du site ne montre que le texte vérifié (ou rien) : sans cet enregistreur, on ne peut pas savoir si une introduction
// propre l'était dès la première fois ou si les garde-fous l'ont rattrapée. Il ne touche ni à `ask.ts` ni aux appels :
// le modèle enveloppé reçoit et renvoie exactement les mêmes objets.

/** Un appel au modèle : le nom du schéma demandé (« comprehension », « reponse »), ce qu'il a rendu, ou pourquoi il a échoué. */
export type AppelEnregistre = { nom: string; sortie: unknown | null; erreur: string | null };

/** Comme `detailDeLErreur` de serveur.ts : la nature et les motifs par essai, jamais le message d'une erreur inconnue (qui pourrait citer une clé). */
function motifDeLErreur(erreur: unknown): string {
  if (erreur instanceof ErreurIA) {
    return erreur.details.length > 0 ? `${erreur.nature} (${erreur.details.join(" ; ")})` : erreur.nature;
  }
  return erreur instanceof Error ? `erreur inattendue (${erreur.name})` : "erreur inattendue";
}

/** Une chaîne vide (le modèle n'avait rien à dire) vaut « pas de texte ». */
function ouNull(texte: string): string | null {
  return texte.trim() === "" ? null : texte;
}

/**
 * Le texte du modèle, avant les garde-fous.
 * - Une réponse avec fiche : l'`intro` du PREMIER appel « reponse ». Si les garde-fous l'ont refusée, le modèle a eu une
 *   seconde chance (voir `repondreAvecLaFiche` dans ask.ts) : c'est bien la première version qu'on garde, car c'est elle
 *   qui montre ce que le modèle écrit sans contrôle. `null` si la fiche ne traite pas la question (`trouve` faux).
 * - Sans fiche : la phrase de l'appel « comprehension » (`message_hors_domaine` si le modèle juge la question hors domaine,
 *   sinon `message_absente`). Le code peut choisir l'autre phrase (une question qui ressemble à une démarche n'est jamais
 *   « hors domaine », voir understand.ts) : cette lecture est une approximation, bonne pour repérer un texte inventé.
 */
function lireTexteBrut(appels: AppelEnregistre[]): string | null {
  const reponse = appels.find((appel) => appel.nom === "reponse");
  if (reponse !== undefined) {
    const lue = ReponseIASchema.safeParse(reponse.sortie);
    return lue.success && lue.data.trouve ? ouNull(lue.data.intro) : null;
  }

  const comprehension = appels.find((appel) => appel.nom === "comprehension");
  if (comprehension === undefined) return null;
  const lue = ComprehensionSchema.safeParse(comprehension.sortie);
  if (!lue.success) return null;
  return ouNull(lue.data.hors_domaine ? lue.data.message_hors_domaine : lue.data.message_absente);
}

/**
 * Enveloppe `modele`. `appels` est la liste vivante des appels, dans l'ordre ; `vider()` la remet à zéro (entre deux
 * questions), sans changer la liste elle-même. Une erreur du modèle est notée puis relancée telle quelle.
 */
export function enregistrerAppels(modele: Modele): {
  modele: Modele;
  appels: AppelEnregistre[];
  introBrute(): string | null;
  vider(): void;
} {
  const appels: AppelEnregistre[] = [];

  const enveloppe: Modele = async (appel) => {
    // L'entrée est notée avant l'appel : l'ordre est celui des appels, même si le modèle ne répond jamais.
    const trace: AppelEnregistre = { nom: appel.nom, sortie: null, erreur: null };
    appels.push(trace);
    try {
      const sortie = await modele(appel);
      trace.sortie = sortie;
      return sortie;
    } catch (erreur) {
      trace.erreur = motifDeLErreur(erreur);
      throw erreur;
    }
  };

  return {
    modele: enveloppe,
    appels,
    introBrute: () => lireTexteBrut(appels),
    vider: () => {
      appels.length = 0;
    },
  };
}
