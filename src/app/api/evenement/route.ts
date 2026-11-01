import { after } from "next/server";
import { creerLimiteur } from "@/lib/ai/cache";
import { visiteurDepuis } from "@/lib/ai/service";
import { estCodeAppareil } from "@/lib/appareil";
import { requeteAdmin } from "@/lib/admin/serveur";
import { nettoyerSlug } from "@/lib/texte";

const limiteur = creerLimiteur({ max: 30, fenetreMs: 60_000 });

/** POST /api/evenement : { "fiche"?: "identifiant", "appareil"?: "code" } note un passage vers e-Sénégal. Rien d'autre n'est accepté. */
export async function POST(request: Request) {
  const visiteur = visiteurDepuis(request.headers);
  const requete = requeteAdmin();
  if (!requete || (visiteur !== undefined && !limiteur.autoriser(visiteur))) return new Response(null, { status: 204 });

  const corps = (await request.json().catch(() => null)) as { fiche?: unknown; appareil?: unknown } | null;
  // Un passage vient toujours d'une démarche : sans elle, ce n'est pas l'application qui écrit.
  const fiche = typeof corps?.fiche === "string" ? nettoyerSlug(corps.fiche) : undefined;
  if (!fiche) return new Response(null, { status: 204 });
  const appareil = estCodeAppareil(corps?.appareil) ? corps.appareil : null;
  after(() =>
    requete("insert into usage_events (kind, fiche_slug, device_id) values ('esenegal', $1, $2)", [fiche, appareil]).catch((erreur: unknown) => {
      console.warn(`[evenement] ${erreur instanceof Error ? erreur.name : "erreur inattendue"}`);
    }),
  );
  return new Response(null, { status: 204 });
}
