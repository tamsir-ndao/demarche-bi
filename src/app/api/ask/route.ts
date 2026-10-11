import { lireDemandeApi } from "@/lib/ai/api";
import { repondreALaQuestion } from "@/lib/ai/serveur";
import { visiteurDepuis } from "@/lib/ai/service";

/**
 * POST /api/ask : { "question": "…", "fiche"?: "identifiant" } → la réponse du site (voir docs/ARCHITECTURE.md).
 * Le site lui-même appelle directement `repondreALaQuestion` ; cette route sert aux autres applications.
 */
export async function POST(request: Request) {
  const corps: unknown = await request.json().catch(() => undefined);
  const demande = lireDemandeApi(corps);
  if (!demande.ok) return Response.json({ erreur: demande.erreur }, { status: 400 });

  const reponse = await repondreALaQuestion(demande.question, {
    ficheSlug: demande.ficheSlug,
    visiteur: visiteurDepuis(request.headers),
  });
  return Response.json(reponse);
}
