import { cookies } from "next/headers";
import { getSql } from "../db";
import type { Requete } from "../avis/journal";
import { COOKIE_ADMIN, jetonValide } from "./session";

// Le back-office branché sur l'environnement (ADMIN_PASSWORD, DATABASE_URL). Serveur uniquement.

export async function estConnecte(): Promise<boolean> {
  const magasin = await cookies();
  return jetonValide(magasin.get(COOKIE_ADMIN)?.value, process.env.ADMIN_PASSWORD, Date.now());
}

/**
 * Lit des chiffres pour l'administrateur : vérifie la session à chaque lecture. Rend `null` si la personne n'est pas
 * connectée, si la base n'est pas branchée ou si elle ne répond pas.
 */
export async function lireAdmin<T>(lire: (requete: Requete, maintenantMs: number) => Promise<T>): Promise<T | null> {
  if (!(await estConnecte())) return null;
  const requete = requeteAdmin();
  if (!requete) return null;
  try {
    return await lire(requete, Date.now());
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
