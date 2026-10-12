import { after } from "next/server";
import { creerLimiteur } from "../ai/cache";
import type { Reponse } from "../ai/ask";
import { getSql } from "../db";
import { creerJournal } from "./journal";
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
