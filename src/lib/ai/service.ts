import type { Fiche } from "../fiches/schema";
import { simplifier } from "../texte";
import { poserQuestion, type OptionsQuestion, type Reponse } from "./ask";
import type { Cache } from "./cache";
import type { Modele } from "./structured";

// Ce que le site appelle pour répondre à une question : le parcours de ask.ts, avec en plus
//  - une mémoire des questions déjà posées (la même question, écrite pareil ou presque, ne coûte rien de plus) ;
//  - une limite de questions par visiteur, pour ne pas vider le quota gratuit du modèle à lui seul.
// Au-delà de la limite, ou si l'IA est en panne, le visiteur reçoit la fiche sans introduction.

export type DependancesService = {
  /** Les fiches que le site peut montrer. */
  fiches: () => Fiche[];
  /** Le modèle, ou `null` quand l'IA n'est pas configurée. */
  modele: Modele | null;
  cache: Cache<Reponse>;
  limiteur: { autoriser(visiteur: string): boolean };
  signaler?: OptionsQuestion["signaler"];
};

export type DemandeQuestion = {
  /** Démarche choisie sur l'écran de précision. */
  ficheSlug?: string;
  /** Qui pose la question (pour la limite) ; sans visiteur, pas de limite. */
  visiteur?: string;
};

/** La même question écrite avec d'autres majuscules, accents ou espaces garde la même clé. */
function cleDeLaQuestion(question: string, ficheSlug: string | undefined): string {
  return `${simplifier(question).replace(/\s+/g, " ").trim()}|${ficheSlug ?? ""}`;
}

export function creerService(dependances: DependancesService) {
  const { modele, cache, limiteur, signaler } = dependances;

  return {
    async repondre(question: string, { ficheSlug, visiteur }: DemandeQuestion): Promise<Reponse> {
      const cle = cleDeLaQuestion(question, ficheSlug);
      const memorisee = cache.lire(cle);
      if (memorisee) return memorisee;

      const autorise = visiteur === undefined || limiteur.autoriser(visiteur);
      let echecDeLIA = false;
      const reponse = await poserQuestion(question, {
        fiches: dependances.fiches(),
        modele: autorise ? modele : null,
        ficheSlug,
        signaler: (etape, erreur) => {
          echecDeLIA = true;
          signaler?.(etape, erreur);
        },
      });

      // Limite atteinte : la fiche est montrée sans introduction, avec le message « l'assistant est très sollicité ».
      if (!autorise && modele !== null) {
        return reponse.type === "fiche" ? { ...reponse, degrade: "saturee" } : reponse;
      }

      const reformulee = reponse.type !== "fiche" || reponse.intro !== null;
      if (modele !== null && !echecDeLIA && reformulee) cache.ecrire(cle, reponse);
      return reponse;
    },
  };
}

/**
 * Qui pose la question, d'après les en-têtes que Vercel ajoute : l'adresse sert seulement à limiter le nombre de
 * questions par minute, elle reste en mémoire quelques instants et n'est jamais enregistrée.
 */
export function visiteurDepuis(entetes: Headers): string | undefined {
  const adresse = (entetes.get("x-forwarded-for") ?? entetes.get("x-real-ip") ?? "").split(",")[0].trim();
  return adresse === "" ? undefined : adresse;
}
