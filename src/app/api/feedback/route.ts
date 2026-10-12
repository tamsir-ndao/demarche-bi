import { enregistrerLAvis } from "@/lib/avis/serveur";

/**
 * POST /api/feedback : { "journalId": "uuid", "utile": true, "commentaire"?: "…" } → 204, ou { "erreur": "code" }
 * avec le statut HTTP qui va avec (voir docs/ARCHITECTURE.md). L'avis est anonyme : ni adresse ni compte ne sont gardés.
 */
export async function POST(request: Request) {
  const resultat = await enregistrerLAvis(request);
  return resultat.ok ? new Response(null, { status: 204 }) : Response.json({ erreur: resultat.code }, { status: resultat.statut });
}
