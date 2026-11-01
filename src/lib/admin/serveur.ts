import { cookies } from "next/headers";
import { getSql } from "../db";
import { lireTableau, type Tableau } from "./donnees";
import type { Requete } from "../avis/journal";
import { COOKIE_ADMIN, jetonValide } from "./session";

// Le back-office branché sur l'environnement (ADMIN_PASSWORD, DATABASE_URL). Serveur uniquement.

export async function estConnecte(): Promise<boolean> {
  const magasin = await cookies();
  return jetonValide(magasin.get(COOKIE_ADMIN)?.value, process.env.ADMIN_PASSWORD, Date.now());
}

/** Les chiffres du back-office, ou rien si la base n'est pas branchée ou ne répond pas. */
export async function tableauAdmin(): Promise<Tableau | null> {
  const requete = requeteAdmin();
  if (!requete) return null;
  try {
    return await lireTableau(requete, Date.now());
  } catch (erreur) {
    console.warn(`[admin] ${erreur instanceof Error ? erreur.name : "erreur inattendue"}`);
    return null;
  }
}

/** La base, ou rien quand elle n'est pas branchée. */
export function requeteAdmin(): Requete | null {
  if (!process.env.DATABASE_URL) return null;
  return (texte, valeurs) => getSql().query(texte, [...valeurs]);
}
