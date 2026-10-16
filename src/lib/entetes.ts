// Les en-têtes de sécurité envoyés avec chaque réponse du site (branchés dans next.config.ts, testés par entetes.test.ts).
//
// Pas de nonce : les pages sont prérendues et il n'y a pas de proxy, donc Next a besoin de 'unsafe-inline' pour ses
// scripts et styles inline (dont le script de l'écran de démarrage, lib/demarrage.ts). La CSP sert surtout à bloquer
// les cadres, les objets, les connexions et scripts tiers. Le site ne charge rien d'ailleurs : pas de police
// téléchargée (celles du système), pas d'image externe, pas de script tiers ; le micro envoie l'audio à /api/… par
// fetch, la lecture à voix haute passe par speechSynthesis (hors CSP), le mode sans connexion par /sw.js.

export type Entete = { key: string; value: string };

/** Les directives de la CSP, une par ligne, avec ce qu'elles autorisent. */
export function directivesCsp(production: boolean): string[] {
  return [
    // Par défaut, seulement notre origine (couvre aussi les cadres : aucun site tiers dans une iframe).
    "default-src 'self'",
    // Scripts de Next (/_next/static) et scripts inline. En développement, React reconstruit les piles d'erreur avec eval.
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    // Feuilles de Tailwind (/_next/static) et styles inline posés par Next et React.
    "style-src 'self' 'unsafe-inline'",
    // Icônes (/icons), images de démarrage iPhone (/demarrage), aperçu de lien : tout vient d'ici. `data:` pour les
    // petites images en ligne (l'afficheur XML de Chrome en dessine une sur /sitemap.xml, sinon il signale une violation).
    "img-src 'self' data:",
    // Polices du système ; une police servie par Next viendrait de /_next/static/media, donc d'ici.
    "font-src 'self'",
    // fetch vers /api/transcribe, /api/avis, /hors-connexion/donnees.json et les données de page de Next.
    "connect-src 'self'",
    // Aucun <audio> ni <video> : MediaRecorder et speechSynthesis ne passent pas par cette directive (pas de blob:).
    "media-src 'self'",
    // Le programme du mode sans connexion (/sw.js).
    "worker-src 'self'",
    // Le manifeste d'installation (/manifest.webmanifest).
    "manifest-src 'self'",
    // Personne ne peut afficher le site dans un cadre (vol de clic).
    "frame-ancestors 'none'",
    // Pas de Flash ni de plugin.
    "object-src 'none'",
    // Pas de <base> qui détournerait les adresses relatives.
    "base-uri 'self'",
    // Les formulaires (question vers /reponse, avis) ne partent jamais ailleurs.
    "form-action 'self'",
  ];
}

/** Les en-têtes, pour la production (`production` vrai) ou le développement. */
export function entetesSecurite(production: boolean): Entete[] {
  return [
    { key: "Content-Security-Policy", value: directivesCsp(production).join("; ") },
    // Doublon de frame-ancestors pour les vieux navigateurs.
    { key: "X-Frame-Options", value: "DENY" },
    // Le navigateur respecte le type annoncé (pas de script deviné dans un fichier).
    { key: "X-Content-Type-Options", value: "nosniff" },
    // En quittant le site vers une source officielle, seul le nom du site part : jamais la question de /reponse?q=.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Le micro, pour nous seulement ; ni caméra, ni position, ni paiement.
    { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
  ];
}

/** Les en-têtes du déploiement courant : 'unsafe-eval' seulement hors production. */
export const ENTETES_SECURITE: Entete[] = entetesSecurite(process.env.NODE_ENV === "production");
