import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/liens";

// Ce que les moteurs de recherche peuvent parcourir : tout le site, sauf les appels du serveur (/api),
// la page de réponse (elle porte la question dans l'adresse) et la page hors connexion (réservée au téléphone).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/reponse", "/hors-connexion"] },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}
