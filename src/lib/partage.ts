// Partager une fiche : le texte envoyé (titre, résumé court, adresse) et le lien WhatsApp de repli.
import type { Fiche } from "./fiches/schema";

/** Au-delà, le résumé est coupé sur un espace : un message de partage reste court. */
export const LONGUEUR_MAX_PARTAGE = 160;

export type TexteDePartage = { title: string; text: string; url: string };

/** Coupe un texte trop long sur le dernier espace avant la limite, avec « … ». */
function couper(texte: string, max: number): string {
  const propre = texte.trim();
  if (propre.length <= max) return propre;
  const tranche = propre.slice(0, max);
  const espace = tranche.lastIndexOf(" ");
  return `${(espace > 0 ? tranche.slice(0, espace) : tranche).trimEnd()}…`;
}

/** Ce qu'on partage pour une fiche : son titre, son résumé (court) et son adresse complète sur le site. */
export function texteDePartage(fiche: Pick<Fiche, "slug" | "titre" | "resume">, origine: string): TexteDePartage {
  return {
    title: fiche.titre,
    text: couper(fiche.resume, LONGUEUR_MAX_PARTAGE),
    url: `${origine.replace(/\/+$/, "")}/demarches/${fiche.slug}`,
  };
}

/** Le lien WhatsApp (sans compte ni script) qui ouvre un message prêt à envoyer, quand le partage natif manque. */
export function lienWhatsApp(texte: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${texte}\n${url}`)}`;
}
