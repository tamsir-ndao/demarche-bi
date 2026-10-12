import { fichesAffichables } from "../fiches/disponibles";
import type { Reponse } from "./ask";
import { creerCache, creerLimiteur } from "./cache";
import { ErreurIA, transcribe } from "./client";
import { getChatProviders } from "./config";
import { creerService, type DemandeQuestion } from "./service";
import { modeleParDefaut } from "./structured";
import { creerServiceTranscription, type ResultatTranscription } from "./transcription";

// Le service de réponse du site, branché sur l'environnement (clés, fiches du dossier content/).
// Serveur uniquement : ne jamais importer depuis un composant client.

const SIX_HEURES_MS = 6 * 60 * 60 * 1000;

function detailDeLErreur(erreur: unknown): string {
  return erreur instanceof ErreurIA ? `${erreur.nature} (${erreur.details.join(" ; ")})` : "erreur inattendue";
}

/** Garde une trace des pannes de l'IA dans les journaux du serveur (avertissement : un quota atteint est attendu), sans clé ni question. */
function journaliser(etape: "comprendre" | "repondre" | "transcrire", erreur: unknown): void {
  console.warn(`[ia] ${etape} : ${detailDeLErreur(erreur)}`);
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

let serviceTranscription: ReturnType<typeof creerServiceTranscription> | undefined;

/** Transcrit l'enregistrement d'une demande POST /api/transcribe. Ne lève jamais d'erreur à cause de Whisper. */
export function transcrireLaDemande(demande: Request): Promise<ResultatTranscription> {
  serviceTranscription ??= creerServiceTranscription({
    transcrire: (audio, options) => transcribe(audio, options),
    limiteur: creerLimiteur({ max: 6, fenetreMs: 60_000 }),
    signaler: (erreur) => journaliser("transcrire", erreur),
  });
  return serviceTranscription.traiter(demande);
}
