import { lireDemandeApi } from "@/lib/ai/api";
import { repondreALaQuestion } from "@/lib/ai/serveur";
import { visiteurDepuis } from "@/lib/ai/service";
import { noterLaReponse } from "@/lib/avis/serveur";
import { construireTour } from "@/lib/conversation/tour";
import { statutAffichage } from "@/lib/fiches/affichage";
import { maintenant } from "@/lib/fiches/disponibles";

/**
 * POST /api/conversation : { "question": "…", "fiche"?: "identifiant", "contexte"?: "démarche en cours" }
 * → ce que l'assistant affiche et dit pour ce tour (voir lib/conversation/tour). Le site n'y garde aucune conversation :
 * c'est le navigateur qui se souvient de la démarche en cours, le temps de l'onglet.
 */
export async function POST(request: Request) {
  const corps: unknown = await request.json().catch(() => undefined);
  const demande = lireDemandeApi(corps);
  if (!demande.ok) return Response.json({ erreur: demande.erreur }, { status: 400 });

  const { question, ficheSlug, contexte } = demande;
  const visiteur = visiteurDepuis(request.headers);
  const reponse = await repondreALaQuestion(question, { ficheSlug, contexte, visiteur });
  noterLaReponse(question, reponse, visiteur);

  if (reponse.type !== "fiche") return Response.json(construireTour(reponse, { suite: false }));
  const statut = statutAffichage(reponse.fiche, await maintenant());
  return Response.json(construireTour(reponse, { suite: reponse.fiche.slug === contexte, statut }));
}
