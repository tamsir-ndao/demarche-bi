import type { NextConfig } from "next";
import { ENTETES_SECURITE } from "./src/lib/entetes";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Les pages lisent les fiches à l'exécution : le déploiement doit les contenir.
  outputFileTracingIncludes: {
    "/*": ["content/demarches/*.md"],
  },
  // La liste des démarches et la page du projet ne font plus partie de l'application : tout passe par la conversation.
  async redirects() {
    return [
      { source: "/demarches", destination: "/", permanent: false },
      { source: "/projet", destination: "/", permanent: false },
      { source: "/reponse", destination: "/", permanent: false },
      { source: "/a-propos", destination: "/reglages", permanent: false },
    ];
  },
  async headers() {
    return [
      // Les en-têtes de sécurité (CSP, cadres, referrer, micro) sur toutes les adresses : voir src/lib/entetes.ts.
      { source: "/(.*)", headers: ENTETES_SECURITE },
      // Le programme du mode sans connexion (public/sw.js) n'est jamais gardé en cache : une mise à jour arrive toujours.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
