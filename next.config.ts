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
