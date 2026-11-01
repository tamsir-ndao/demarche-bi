import type { StockageLocal } from "../bienvenue";
import type { TourAssistant } from "./tour";

// L'historique des conversations, gardé uniquement sur le téléphone (localStorage), sans compte. Fonctions pures, testées.

export type Tour = { id: number; question: string } & ({ etat: "attente" } | { etat: "pret"; reponse: TourAssistant } | { etat: "hors_ligne" });
export type TourPret = Extract<Tour, { etat: "pret" }>;
export type Memoire = { contexte?: string; aCompleter?: string };
export type ConversationGardee = { id: string; maj: number; tours: TourPret[]; memoire: Memoire };

export const CLE_HISTORIQUE = "demarche-bi:historique";
export const MAX_CONVERSATIONS = 30;
/** Le paramètre d'adresse qui rouvre une conversation sur l'accueil : `/?conversation=…`. */
export const PARAMETRE_CONVERSATION = "conversation";

/** La discussion en cours, le temps de l'onglet : revenir d'une fiche ne la fait pas perdre. */
export const CLE_DISCUSSION = "demarche-bi:discussion";

/** On a quitté la discussion (elle reste dans l'historique) : l'accueil ne doit pas la réafficher. */
export function fermerDiscussion(): void {
  try {
    sessionStorage.removeItem(CLE_DISCUSSION);
  } catch {
    // Rien à fermer si la mémoire de l'onglet est bloquée.
  }
}

/** Seules les vraies réponses sont gardées : ni l'attente, ni les échecs de connexion. */
export function toursAGarder(tours: Tour[]): TourPret[] {
  return tours.filter((tour): tour is TourPret => tour.etat === "pret");
}

function estValide(valeur: unknown): valeur is ConversationGardee {
  if (typeof valeur !== "object" || valeur === null) return false;
  const { id, maj, tours } = valeur as Partial<ConversationGardee>;
  return typeof id === "string" && typeof maj === "number" && Array.isArray(tours) && tours.length > 0;
}

/** Les conversations, de la plus récente à la plus ancienne. Mémoire absente, bloquée ou illisible : liste vide. */
export function lireHistorique(stockage: StockageLocal | undefined): ConversationGardee[] {
  try {
    const liste: unknown = JSON.parse(stockage?.getItem(CLE_HISTORIQUE) ?? "[]");
    return Array.isArray(liste) ? liste.filter(estValide).sort((a, b) => b.maj - a.maj) : [];
  } catch {
    return [];
  }
}

function ecrire(stockage: StockageLocal | undefined, liste: ConversationGardee[]): void {
  try {
    stockage?.setItem(CLE_HISTORIQUE, JSON.stringify(liste));
  } catch {
    // Mémoire pleine : on libère de la place en retirant la plus ancienne. Mémoire bloquée : rien n'est gardé.
    if (liste.length > 1) ecrire(stockage, liste.slice(0, -1));
  }
}

/** Ajoute la conversation ou la met à jour, en tête de liste ; les plus anciennes sortent au-delà du plafond. */
export function garderConversation(stockage: StockageLocal | undefined, conversation: ConversationGardee): void {
  const autres = lireHistorique(stockage).filter(({ id }) => id !== conversation.id);
  ecrire(stockage, [conversation, ...autres].slice(0, MAX_CONVERSATIONS));
}

export function retrouverConversation(stockage: StockageLocal | undefined, id: string): ConversationGardee | undefined {
  return lireHistorique(stockage).find((conversation) => conversation.id === id);
}

export function supprimerConversation(stockage: StockageLocal | undefined, id: string): void {
  ecrire(stockage, lireHistorique(stockage).filter((conversation) => conversation.id !== id));
}

export function effacerHistorique(stockage: StockageLocal | undefined): void {
  try {
    stockage?.removeItem(CLE_HISTORIQUE);
  } catch {
    // Rien à effacer si la mémoire est bloquée.
  }
}

/** « Aujourd'hui », « Hier », « 28 oct. », avec l'année si elle n'est pas la même. */
export function dateDeConversation(maj: number, maintenant: number): string {
  const jour = new Date(maj);
  const auj = new Date(maintenant);
  const debut = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const ecart = Math.round((debut(auj) - debut(jour)) / 86_400_000);
  if (ecart === 0) return "Aujourd’hui";
  if (ecart === 1) return "Hier";
  const memeAnnee = jour.getFullYear() === auj.getFullYear();
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", ...(memeAnnee ? {} : { year: "numeric" }) }).format(jour);
}
