import type { MetadataRoute } from "next";

// Ce qui rend Démarche-Bi installable : nom, ouverture en plein écran, icônes (le logo : carré vert, coche foncée).
// Les couleurs sont celles du site clair ; le mode sombre est réglé par la balise theme-color de layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Démarche-Bi",
    short_name: "Démarche-Bi",
    description: "Pose ta question sur une démarche administrative au Sénégal.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4faf6",
    theme_color: "#f4faf6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // « maskable » : plein cadre, Android le découpe selon la forme de son thème.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
