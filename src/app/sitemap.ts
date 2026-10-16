import type { MetadataRoute } from "next";
import { filtrerAffichables } from "@/lib/fiches/affichage";
import { loadFiches } from "@/lib/fiches/load";
import type { Fiche } from "@/lib/fiches/schema";
import { URL_SITE } from "@/lib/liens";

// Le plan du site pour les moteurs de recherche : les pages fixes et une entrée par fiche vérifiée.
// Un brouillon n'y figure jamais, même en développement : il n'a rien à faire dans un moteur de recherche.

const PAGES_FIXES = ["/", "/demarches", "/projet", "/a-propos"];

/** Les entrées du plan du site, à partir des fiches lues (fonction pure, testée). */
export function entreesDuSitemap(fiches: Pick<Fiche, "slug" | "statut" | "verifie_le">[]): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = PAGES_FIXES.map((chemin) => ({ url: `${URL_SITE}${chemin}` }));
  const demarches: MetadataRoute.Sitemap = filtrerAffichables(fiches, false).map((fiche) => ({
    url: `${URL_SITE}/demarches/${fiche.slug}`,
    // La date de vérification est la dernière date sûre que l'on connaît pour une fiche.
    ...(fiche.verifie_le ? { lastModified: fiche.verifie_le } : {}),
  }));
  return [...pages, ...demarches];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return entreesDuSitemap(loadFiches().fiches);
}
