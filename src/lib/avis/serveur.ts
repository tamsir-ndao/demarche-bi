import { after } from "next/server";
import { creerLimiteur } from "../ai/cache";
import type { Reponse } from "../ai/ask";
import { getSql } from "../db";
import { creerJournal } from "./journal";
import { autoriserLaPurge, creerPurge } from "./purge";
import { creerServiceAvis, type ResultatAvis } from "./service";

// Le journal anonyme et les avis du site, branchés sur l'environnement (DATABASE_URL, Neon).
// Serveur uniquement : ne jamais importer depuis un composant client. Sans DATABASE_URL, rien n'est noté.

/** La panne en une ligne, sans le message de la base : il peut citer la ligne refusée, donc la question. */
function natureDeLaPanne(erreur: unknown): string {
  if (!(erreur instanceof Error)) return "erreur inattendue";
  const code = "code" in erreur && typeof erreur.code === "string" ? ` (code ${erreur.code})` : "";
  return `${erreur.name}${code}`;
}

let service: ReturnType<typeof creerServiceAvis> | undefined;

function leService() {
  service ??= creerServiceAvis({
    journal: process.env.DATABASE_URL
      ? creerJournal({
          requete: (texte, valeurs) => getSql().query(texte, [...valeurs]),
          signaler: (etape, erreur) => console.warn(`[journal] ${etape} : ${natureDeLaPanne(erreur)}`),
        })
      : null,
    limiteurAvis: creerLimiteur({ max: 10, fenetreMs: 60_000 }),
    limiteurJournal: creerLimiteur({ max: 30, fenetreMs: 60_000 }),
    apres: (travail) => after(travail),
    nouvelIdentifiant: () => crypto.randomUUID(),
  });
  return service;
}

/** Note la réponse montrée (après l'envoi de la page) et rend son identifiant, ou `null` si elle n'est pas notée. */
export function noterLaReponse(question: string, reponse: Reponse, visiteur?: string): string | null {
  return leService().noterLaReponse(question, reponse, visiteur);
}

/** Enregistre l'avis d'une demande POST /api/feedback. Ne lève jamais d'erreur à cause de la base. */
export function enregistrerLAvis(demande: Request): Promise<ResultatAvis> {
  return leService().enregistrerLAvis(demande);
}

let purge: ReturnType<typeof creerPurge> | undefined;

export type ResultatPurgeDemandee = { statut: 200; reponses: number; avis: number } | { statut: 401 | 503 };

/**
 * Purge le journal d'une demande GET /api/cron/purge (la tâche planifiée de Vercel, voir vercel.json) : les questions et
 * les avis de plus de 90 jours. Refuse (401) sans le secret CRON_SECRET ; sans base de données, il n'y a rien à purger.
 */
export async function purgerLeJournal(demande: Request): Promise<ResultatPurgeDemandee> {
  if (!autoriserLaPurge(demande.headers.get("authorization"), process.env.CRON_SECRET)) return { statut: 401 };
  if (!process.env.DATABASE_URL) return { statut: 200, reponses: 0, avis: 0 };

  purge ??= creerPurge({
    requete: (texte, valeurs) => getSql().query(texte, [...valeurs]),
    signaler: (etape, erreur) => console.warn(`[purge] ${etape} : ${natureDeLaPanne(erreur)}`),
  });
  const resultat = await purge.purger();
  if (!resultat.ok) return { statut: 503 };
  console.info(`[purge] ${resultat.reponses} réponse(s) et ${resultat.avis} avis de plus de 90 jours supprimés`);
  return { statut: 200, reponses: resultat.reponses, avis: resultat.avis };
}
