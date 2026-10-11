import { cacheLife } from "next/cache";
import { brouillonsAutorises, fichePourAffichage, filtrerAffichables } from "./affichage";
import { loadFiches } from "./load";
import type { Fiche } from "./schema";

// Accès aux fiches pour les pages du site (serveur uniquement : lit les fichiers de content/).

/** Les fiches que le site peut montrer, prêtes pour l'écran : les vérifiées, plus les brouillons en développement. */
export function fichesAffichables(): Fiche[] {
  return filtrerAffichables(loadFiches().fiches, brouillonsAutorises()).map(fichePourAffichage);
}

export function ficheAffichable(slug: string): Fiche | undefined {
  return fichesAffichables().find((fiche) => fiche.slug === slug);
}

async function maintenantIso(): Promise<string> {
  "use cache";
  cacheLife("hours");
  return new Date().toISOString();
}

/**
 * La date du jour pour savoir si une vérification est trop ancienne. Avec les Cache Components,
 * une page pré-générée ne peut pas lire l'heure directement : on la garde en cache, une heure
 * d'écart ne change rien à « vérifié il y a plus d'un an ».
 */
export async function maintenant(): Promise<Date> {
  return new Date(await maintenantIso());
}
