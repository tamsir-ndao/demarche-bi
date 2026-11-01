import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// L'accès au back-office : un mot de passe (ADMIN_PASSWORD), puis un cookie signé valable 7 jours. Changer le mot de
// passe invalide les sessions ouvertes. Sans mot de passe réglé, personne n'entre. Serveur uniquement.

export const COOKIE_ADMIN = "demarche-admin";
export const DUREE_SESSION_S = 7 * 24 * 60 * 60;

/** Compare des empreintes de taille fixe : la durée de la comparaison ne dit rien du secret. */
function egaux(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

const signature = (expiration: number, secret: string) => createHmac("sha256", `demarche-bi-admin:${secret}`).update(String(expiration)).digest("hex");

export function motDePasseValide(saisi: string, secret: string | undefined): boolean {
  return Boolean(secret) && egaux(saisi, secret as string);
}

export function creerJeton(secret: string, maintenantMs: number): string {
  const expiration = Math.floor(maintenantMs / 1000) + DUREE_SESSION_S;
  return `${expiration}.${signature(expiration, secret)}`;
}

export function jetonValide(jeton: string | undefined, secret: string | undefined, maintenantMs: number): boolean {
  if (!jeton || !secret) return false;
  const [brute, signee] = jeton.split(".");
  const expiration = Number(brute);
  if (!Number.isInteger(expiration) || !signee || expiration * 1000 <= maintenantMs) return false;
  return egaux(signee, signature(expiration, secret));
}
