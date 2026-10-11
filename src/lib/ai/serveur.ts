import { fichesAffichables } from "../fiches/disponibles";
import type { Reponse } from "./ask";
import { creerCache, creerLimiteur } from "./cache";
import { ErreurIA } from "./client";
import { getChatProviders } from "./config";
import { creerService, type DemandeQuestion } from "./service";
import { modeleParDefaut } from "./structured";

// Le service de réponse du site, branché sur l'environnement (clés, fiches du dossier content/).
// Serveur uniquement : ne jamais importer depuis un composant client.

const SIX_HEURES_MS = 6 * 60 * 60 * 1000;

/** Garde une trace des pannes de l'IA dans les journaux du serveur, sans clé ni question de l'utilisateur. */
function journaliser(etape: "comprendre" | "repondre", erreur: unknown): void {
  const detail = erreur instanceof ErreurIA ? `${erreur.nature} (${erreur.details.join(" ; ")})` : "erreur inattendue";
  console.error(`[ia] ${etape} : ${detail}`);
}

let service: ReturnType<typeof creerService> | undefined;

/** Répond à une question avec les fiches du site. Ne lève jamais d'erreur à cause de l'IA. */
export function repondreALaQuestion(question: string, demande: DemandeQuestion): Promise<Reponse> {
  service ??= creerService({
    fiches: fichesAffichables,
    modele: getChatProviders().length > 0 ? modeleParDefaut : null,
    cache: creerCache<Reponse>({ max: 300, dureeMs: SIX_HEURES_MS }),
    limiteur: creerLimiteur({ max: 10, fenetreMs: 60_000 }),
    signaler: journaliser,
  });
  return service.repondre(question, demande);
}
