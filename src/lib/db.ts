import { neon } from "@neondatabase/serverless";

/**
 * Client Neon (HTTP, adapté à Vercel et aux routes API).
 * À utiliser uniquement côté serveur : DATABASE_URL ne doit jamais atteindre le navigateur.
 *
 * Exemple :
 *   const rows = await sql`select * from products where supplier_id = ${id}`;
 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquante. Renseigne-la dans .env.local (voir docs/SETUP.md).",
    );
  }
  return neon(url);
}
