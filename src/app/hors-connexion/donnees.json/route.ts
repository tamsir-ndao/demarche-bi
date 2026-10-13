import { fichesAffichables } from "@/lib/fiches/disponibles";
import { donneesHorsConnexion } from "@/lib/hors-connexion/construire";

/**
 * GET /hors-connexion/donnees.json : la liste des pages que le téléphone copie (public/sw.js) et les fiches pour la
 * recherche sans connexion. Préparé à la construction du site, comme les pages : il montre les mêmes fiches qu'elles.
 */
export function GET() {
  return Response.json(donneesHorsConnexion(fichesAffichables()));
}
