// Démarche-Bi sans connexion. Ce programme tourne dans le navigateur du téléphone (« service worker »).
//
// Ce qu'il garde : les pages du site (accueil, démarches, fiches, projet, à propos) et les fichiers dont elles ont
// besoin. Les pages passent par le réseau d'abord : avec du réseau, on voit toujours la version à jour ; la copie ne
// sert qu'en secours. Les fichiers au nom unique (/_next/static) sont pris dans la copie, ceux qui peuvent changer
// (icônes) sont rafraîchis en arrière-plan.
//
// Ce qu'il ne garde JAMAIS : les questions, les réponses (/reponse), les appels du serveur (/api). Sans connexion,
// une question va vers /hors-connexion, qui cherche dans les fiches gardées sur le téléphone.
//
// Pour le désactiver ou repartir de zéro : changer VERSION (les anciennes copies sont supprimées à l'activation).
// Les règles ci-dessous sont testées par src/lib/hors-connexion/sw.test.ts. Doc : docs/ARCHITECTURE.md.

const VERSION = "v1";
const CACHE_PAGES = "demarche-bi-pages-" + VERSION;
const CACHE_FICHIERS = "demarche-bi-fichiers-" + VERSION;

const URL_DONNEES = "/hors-connexion/donnees.json";
const PAGE_HORS_CONNEXION = "/hors-connexion";
/** Au-delà, on prend la copie plutôt que d'attendre un réseau qui ne répond pas (la page se met à jour quand il répond). */
const DELAI_RESEAU_MS = 4000;
/** Toujours copiés, même si aucune page ne les cite. */
const FICHIERS_FIXES = ["/manifest.webmanifest", "/favicon.ico", "/apple-icon.png", "/icons/icon-192.png", "/icons/icon-512.png"];

/** Les pages dont on garde une copie. */
function estPageGardee(chemin) {
  return (
    chemin === "/" ||
    chemin === "/demarches" ||
    chemin === "/projet" ||
    chemin === "/a-propos" ||
    chemin === PAGE_HORS_CONNEXION ||
    chemin === URL_DONNEES ||
    /^\/demarches\/[a-z0-9-]+$/.test(chemin)
  );
}

/** Les fichiers dont on garde une copie : au nom unique (/_next/static), ou icônes et manifeste. */
function estFichierGarde(chemin) {
  return (
    chemin.startsWith("/_next/static/") ||
    chemin.startsWith("/icons/") ||
    chemin === "/manifest.webmanifest" ||
    chemin === "/favicon.ico" ||
    chemin === "/apple-icon.png"
  );
}

/** Un fichier dont le nom change quand son contenu change : la copie est toujours bonne. */
function estFichierUnique(chemin) {
  return chemin.startsWith("/_next/static/");
}

/** Les fichiers (scripts, styles, polices) cités par une page, pour les copier avec elle. */
function fichiersDeLaPage(html) {
  const trouves = new Set();
  const chemins = new Set();
  for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)<>]+/g)) {
    trouves.add(m[0]);
    chemins.add(m[0].split("?")[0]);
  }
  // Les fichiers chargés plus tard sont cités sans le début de l'adresse, dans les données de la page.
  for (const m of html.matchAll(/static\/(?:chunks|media|css)\/[A-Za-z0-9_.~-]+\.(?:js|css|woff2?)/g)) {
    if (!chemins.has("/_next/" + m[0])) trouves.add("/_next/" + m[0]);
  }
  return [...trouves];
}

/** Le chemin d'une adresse, sans la recherche (?q=…) : c'est lui qui désigne une copie. */
function cheminDe(adresse, base) {
  return new URL(adresse, base).pathname;
}

function attendre(ms) {
  return new Promise((_, refuser) => setTimeout(() => refuser(new Error("délai dépassé")), ms));
}

/** Garde la réponse dans le cache et prévient le navigateur de ne pas arrêter le programme avant la fin de la copie. */
function garder(evenement, cache, chemin, reponse) {
  evenement.waitUntil(cache.put(chemin, reponse.clone()).catch(() => {}));
}

/** Pages : le réseau d'abord ; sans réseau (ou s'il tarde trop), la copie ; sans copie, la page « hors connexion ». */
async function pageReseauDAbord(evenement) {
  const requete = evenement.request;
  const cache = await caches.open(CACHE_PAGES);
  const chemin = cheminDe(requete.url);
  const reseau = fetch(requete).then((reponse) => {
    if (reponse.ok) garder(evenement, cache, chemin, reponse);
    return reponse;
  });
  // Le programme reste en vie tant que le réseau n'a pas répondu : une page lente met quand même sa copie à jour.
  evenement.waitUntil(reseau.then(() => {}, () => {}));
  try {
    return await Promise.race([reseau, attendre(DELAI_RESEAU_MS)]);
  } catch {
    const copie = await cache.match(chemin, { ignoreVary: true });
    if (copie) return copie;
    try {
      return await reseau; // pas de copie : mieux vaut attendre le réseau que d'échouer tout de suite
    } catch {
      return (await cache.match(PAGE_HORS_CONNEXION, { ignoreVary: true })) || Response.error();
    }
  }
}

/** Une question : le serveur d'abord ; sans réseau, la page « hors connexion » avec la même question. */
async function questionOuHorsConnexion(requete) {
  try {
    return await fetch(requete);
  } catch {
    const url = new URL(requete.url);
    return Response.redirect(new URL(PAGE_HORS_CONNEXION + url.search, url.origin).href, 302);
  }
}

/** Fichiers : la copie d'abord. Ceux qui peuvent changer (icônes) sont aussi rafraîchis en arrière-plan. */
async function fichierCopieDAbord(evenement) {
  const requete = evenement.request;
  const chemin = cheminDe(requete.url);
  const cache = await caches.open(CACHE_FICHIERS);
  const copie = await cache.match(chemin, { ignoreVary: true });
  if (copie && estFichierUnique(chemin)) return copie; // nom unique : la copie est toujours la bonne
  const reseau = fetch(requete).then((reponse) => {
    if (reponse.ok) garder(evenement, cache, chemin, reponse);
    return reponse;
  });
  if (!copie) return reseau;
  evenement.waitUntil(reseau.then(() => {}, () => {}));
  return copie;
}

/** Copie les pages du site et leurs fichiers, puis supprime les fichiers que plus aucune page ne cite. */
async function toutGarder() {
  const reponseDonnees = await fetch(URL_DONNEES, { cache: "no-cache" });
  if (!reponseDonnees.ok) throw new Error("liste des pages introuvable");
  const donnees = await reponseDonnees.clone().json();
  const pages = await caches.open(CACHE_PAGES);
  await pages.put(URL_DONNEES, reponseDonnees);

  const fichiers = new Set(FICHIERS_FIXES);
  await Promise.all(
    donnees.pages.map(async (chemin) => {
      try {
        const reponse = await fetch(chemin, { cache: "no-cache" });
        if (!reponse.ok) return;
        await pages.put(chemin, reponse.clone());
        for (const fichier of fichiersDeLaPage(await reponse.text())) fichiers.add(fichier);
      } catch {
        // Une page qui ne vient pas ne bloque pas les autres ; elle sera copiée à la prochaine mise à jour.
      }
    }),
  );

  const cache = await caches.open(CACHE_FICHIERS);
  const gardes = new Set([...fichiers].map((fichier) => cheminDe(fichier, self.location.origin)));
  await Promise.all(
    [...fichiers].map(async (fichier) => {
      const chemin = cheminDe(fichier, self.location.origin);
      try {
        if (estFichierUnique(chemin) && (await cache.match(chemin, { ignoreVary: true }))) return;
        const reponse = await fetch(fichier, { cache: estFichierUnique(chemin) ? "default" : "no-cache" });
        if (reponse.ok) await cache.put(chemin, reponse);
      } catch {
        // Idem : ce fichier sera repris à la prochaine mise à jour, ou à la première visite avec du réseau.
      }
    }),
  );
  for (const requete of await cache.keys()) {
    if (!gardes.has(new URL(requete.url).pathname)) await cache.delete(requete);
  }
}

/** Supprime les copies des anciennes versions. */
async function nettoyerLesAnciennes() {
  const courants = [CACHE_PAGES, CACHE_FICHIERS];
  for (const nom of await caches.keys()) {
    if (nom.startsWith("demarche-bi-") && !courants.includes(nom)) await caches.delete(nom);
  }
}

self.addEventListener("install", (evenement) => {
  self.skipWaiting();
  evenement.waitUntil(toutGarder());
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(nettoyerLesAnciennes().then(() => self.clients.claim()));
});

// La page demande une mise à jour des copies (au plus une fois par demi-journée, voir lib/hors-connexion/rafraichir).
self.addEventListener("message", (evenement) => {
  if (evenement.data === "rafraichir") evenement.waitUntil(toutGarder().catch(() => {}));
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  if (requete.mode === "navigate") {
    if (url.pathname === "/reponse") evenement.respondWith(questionOuHorsConnexion(requete));
    else if (estPageGardee(url.pathname)) evenement.respondWith(pageReseauDAbord(evenement));
    return; // les autres adresses (/api, pages inconnues) ne regardent pas ce programme
  }

  // Next demande aussi les données de page pendant une navigation douce : sans réseau il passe alors par une
  // navigation complète, que le cas ci-dessus sait servir. On ne les garde pas.
  if (requete.headers.has("rsc") || url.searchParams.has("_rsc")) return;

  if (url.pathname === URL_DONNEES) evenement.respondWith(pageReseauDAbord(evenement));
  else if (estFichierGarde(url.pathname)) evenement.respondWith(fichierCopieDAbord(evenement));
});
