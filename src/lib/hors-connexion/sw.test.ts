// Tests des règles de public/sw.js (le programme du mode sans connexion), chargé dans un faux navigateur : aucun réseau.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

const SOURCE = readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8");
const ORIGINE = "https://demarche-bi.test";

type Ecouteur = (evenement: unknown) => void;

/** Un faux cache : garde les réponses par adresse (sans la recherche) et note ce qu'on y met. */
function fauxCache() {
  const contenu = new Map<string, Response>();
  return {
    contenu,
    async match(cle: string | Request) {
      const adresse = new URL(typeof cle === "string" ? cle : cle.url, ORIGINE).pathname;
      return contenu.get(adresse)?.clone();
    },
    async put(cle: string | Request, reponse: Response) {
      contenu.set(new URL(typeof cle === "string" ? cle : cle.url, ORIGINE).pathname, reponse);
    },
    async keys() {
      return [...contenu.keys()].map((chemin) => new Request(ORIGINE + chemin));
    },
    async delete(cle: Request) {
      return contenu.delete(new URL(cle.url).pathname);
    },
  };
}

/** Charge sw.js avec un faux navigateur. `reseau` répond aux fetch ; s'il lève une erreur, c'est « pas de connexion ». */
function charger(reseau: (requete: Request | string) => Promise<Response>) {
  const caches = new Map<string, ReturnType<typeof fauxCache>>();
  const ecouteurs = new Map<string, Ecouteur>();
  const appels: string[] = [];
  const sandbox = {
    self: {
      location: { origin: ORIGINE },
      addEventListener: (type: string, ecouteur: Ecouteur) => ecouteurs.set(type, ecouteur),
      skipWaiting: () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async (nom: string) => {
        if (!caches.has(nom)) caches.set(nom, fauxCache());
        return caches.get(nom);
      },
      keys: async () => [...caches.keys()],
      delete: async (nom: string) => caches.delete(nom),
    },
    fetch: async (requete: Request | string) => {
      appels.push(typeof requete === "string" ? requete : new URL(requete.url).pathname);
      return reseau(requete);
    },
    Response,
    Request,
    URL,
    setTimeout,
    console,
  };
  const contexte = vm.createContext(sandbox);
  vm.runInContext(SOURCE, contexte);
  const fonctions = (nom: string) => vm.runInContext(nom, contexte) as (...args: never[]) => unknown;
  const evenement = (requete: Request) => {
    const attentes: Promise<unknown>[] = [];
    let reponse: Promise<Response> | undefined;
    return {
      request: requete,
      respondWith: (promesse: Promise<Response>) => (reponse = promesse),
      waitUntil: (promesse: Promise<unknown>) => void attentes.push(promesse),
      reponse: () => reponse,
      fini: () => Promise.all(attentes),
    };
  };
  const cacheDe = async (nom: string) => (await sandbox.caches.open(nom)) as ReturnType<typeof fauxCache>;
  return { fonctions, ecouteurs, appels, evenement, cacheDe, caches };
}

const html = (texte = "<html></html>") => new Response(texte, { status: 200, headers: { "content-type": "text/html" } });
const navigation = (chemin: string) => {
  const requete = new Request(ORIGINE + chemin);
  Object.defineProperty(requete, "mode", { value: "navigate" });
  return requete;
};
const horsConnexion = async () => {
  throw new TypeError("Failed to fetch");
};

describe("quelles adresses sont gardées", () => {
  const { fonctions } = charger(horsConnexion);
  const page = fonctions("estPageGardee") as unknown as (chemin: string) => boolean;
  const fichier = fonctions("estFichierGarde") as unknown as (chemin: string) => boolean;

  it("garde les pages du site et chaque fiche", () => {
    for (const chemin of ["/", "/demarches", "/demarches/passeport-ordinaire", "/projet", "/a-propos", "/hors-connexion", "/hors-connexion/donnees.json"]) {
      assert.equal(page(chemin), true, chemin);
    }
  });
  it("ne garde jamais les réponses, les appels du serveur ni les pages inconnues", () => {
    for (const chemin of ["/reponse", "/api/ask", "/api/transcribe", "/api/feedback", "/api/cron/purge", "/demarches/a/b", "/demarches/Passeport", "/autre"]) {
      assert.equal(page(chemin), false, chemin);
      assert.equal(fichier(chemin), false, chemin);
    }
  });
  it("garde les fichiers du site, pas ceux des autres", () => {
    for (const chemin of ["/_next/static/chunks/abc.js", "/icons/icon-192.png", "/manifest.webmanifest", "/favicon.ico", "/apple-icon.png"]) {
      assert.equal(fichier(chemin), true, chemin);
    }
    assert.equal(fichier("/_next/image"), false);
    assert.equal(fichier("/sw.js"), false);
  });
});

describe("fichiersDeLaPage", () => {
  const { fonctions } = charger(horsConnexion);
  const lister = fonctions("fichiersDeLaPage") as unknown as (html: string) => string[];
  it("trouve les scripts, styles et polices cités par la page, et ceux cités dans ses données", () => {
    const page =
      '<link rel="stylesheet" href="/_next/static/chunks/a.css?dpl=dpl_1"/><script src="/_next/static/chunks/b.js" async=""></script>' +
      '<script>self.__next_f.push([1,"[\\"static/chunks/c.js\\",\\"static/media/f.woff2\\"]"])</script><img src="/icons/x.png"/>';
    assert.deepEqual(
      Array.from(lister(page)).sort(),
      ["/_next/static/chunks/a.css?dpl=dpl_1", "/_next/static/chunks/b.js", "/_next/static/chunks/c.js", "/_next/static/media/f.woff2"].sort(),
    );
  });
  it("ne trouve rien dans une page sans fichiers", () => {
    assert.deepEqual(Array.from(lister("<html><body>Bonjour</body></html>")), []);
  });
});

describe("le réseau d'abord pour les pages", () => {
  it("avec du réseau : montre la page à jour et en garde une copie", async () => {
    const sw = charger(async () => html("version 2"));
    const e = sw.evenement(navigation("/demarches/ninea?q=1"));
    sw.ecouteurs.get("fetch")?.(e);
    assert.equal(await (await e.reponse())?.text(), "version 2");
    await e.fini();
    assert.equal(await (await (await sw.cacheDe("demarche-bi-pages-v1")).match("/demarches/ninea"))?.text(), "version 2");
  });
  it("sans réseau : montre la copie", async () => {
    let enLigne = true;
    const sw = charger(async () => (enLigne ? html("copie") : horsConnexion()));
    const un = sw.evenement(navigation("/demarches"));
    sw.ecouteurs.get("fetch")?.(un);
    await un.reponse();
    await un.fini();
    enLigne = false;
    const deux = sw.evenement(navigation("/demarches"));
    sw.ecouteurs.get("fetch")?.(deux);
    assert.equal(await (await deux.reponse())?.text(), "copie");
  });
  it("sans réseau et sans copie : montre la page « hors connexion » si elle est gardée", async () => {
    const sw = charger(horsConnexion);
    await (await sw.cacheDe("demarche-bi-pages-v1")).put("/hors-connexion", html("page de secours"));
    const e = sw.evenement(navigation("/demarches/ninea"));
    sw.ecouteurs.get("fetch")?.(e);
    assert.equal(await (await e.reponse())?.text(), "page de secours");
  });
  it("ne garde pas une page en erreur", async () => {
    const sw = charger(async () => new Response("introuvable", { status: 404 }));
    const e = sw.evenement(navigation("/demarches/inconnue"));
    sw.ecouteurs.get("fetch")?.(e);
    assert.equal((await e.reponse())?.status, 404);
    await e.fini();
    assert.equal(await (await sw.cacheDe("demarche-bi-pages-v1")).match("/demarches/inconnue"), undefined);
  });
});

describe("les questions", () => {
  it("avec du réseau : le serveur répond, et rien n'est gardé", async () => {
    const sw = charger(async () => html("réponse du serveur"));
    const e = sw.evenement(navigation("/reponse?q=passeport"));
    sw.ecouteurs.get("fetch")?.(e);
    assert.equal(await (await e.reponse())?.text(), "réponse du serveur");
    await e.fini();
    for (const nom of sw.caches.keys()) assert.equal((await sw.cacheDe(nom)).contenu.size, 0);
  });
  it("sans réseau : renvoie vers la page « hors connexion » avec la même question", async () => {
    const sw = charger(horsConnexion);
    const e = sw.evenement(navigation("/reponse?q=passeport+enfant"));
    sw.ecouteurs.get("fetch")?.(e);
    const reponse = await e.reponse();
    assert.equal(reponse?.status, 302);
    assert.equal(reponse?.headers.get("location"), `${ORIGINE}/hors-connexion?q=passeport+enfant`);
  });
});

describe("ce que le programme laisse passer", () => {
  const laisse = (requete: Request) => {
    const sw = charger(async () => html());
    const e = sw.evenement(requete);
    sw.ecouteurs.get("fetch")?.(e);
    return e.reponse() === undefined;
  };
  it("les envois (avis, voix), les autres sites, les appels du serveur et les pages inconnues", () => {
    assert.equal(laisse(new Request(ORIGINE + "/api/feedback", { method: "POST", body: "x" })), true);
    assert.equal(laisse(new Request("https://autre.site/_next/static/a.js")), true);
    assert.equal(laisse(navigation("/api/ask")), true);
    assert.equal(laisse(navigation("/page-inconnue")), true);
  });
  it("les données de page que Next demande pendant une navigation douce", () => {
    assert.equal(laisse(new Request(ORIGINE + "/demarches/ninea?_rsc=abc", { headers: { rsc: "1" } })), true);
    assert.equal(laisse(new Request(ORIGINE + "/_next/static/a.js?_rsc=1")), true);
  });
});

describe("les fichiers", () => {
  it("au nom unique : la copie d'abord, sans retélécharger", async () => {
    const sw = charger(async () => new Response("contenu"));
    const premier = sw.evenement(new Request(ORIGINE + "/_next/static/chunks/a.js"));
    sw.ecouteurs.get("fetch")?.(premier);
    await premier.reponse();
    await premier.fini();
    const avant = sw.appels.length;
    const second = sw.evenement(new Request(ORIGINE + "/_next/static/chunks/a.js"));
    sw.ecouteurs.get("fetch")?.(second);
    assert.equal(await (await second.reponse())?.text(), "contenu");
    assert.equal(sw.appels.length, avant);
  });
  it("une icône : la copie tout de suite, puis mise à jour en arrière-plan", async () => {
    let version = "ancienne";
    const sw = charger(async () => new Response(version));
    const un = sw.evenement(new Request(ORIGINE + "/icons/icon-192.png"));
    sw.ecouteurs.get("fetch")?.(un);
    await un.reponse();
    await un.fini();
    version = "nouvelle";
    const deux = sw.evenement(new Request(ORIGINE + "/icons/icon-192.png"));
    sw.ecouteurs.get("fetch")?.(deux);
    assert.equal(await (await deux.reponse())?.text(), "ancienne");
    await deux.fini();
    const trois = sw.evenement(new Request(ORIGINE + "/icons/icon-192.png"));
    sw.ecouteurs.get("fetch")?.(trois);
    assert.equal(await (await trois.reponse())?.text(), "nouvelle");
  });
});

describe("l'installation et la mise à jour", () => {
  const site = (chemin: string): Response => {
    if (chemin === "/hors-connexion/donnees.json") return Response.json({ pages: ["/", "/demarches/ninea", "/projet"], fiches: [], cartes: [] });
    if (chemin === "/") return html('<script src="/_next/static/chunks/a.js"></script>');
    if (chemin === "/demarches/ninea") return html('<script src="/_next/static/chunks/b.js"></script>');
    if (chemin === "/projet") return new Response("erreur", { status: 500 });
    return new Response("fichier de " + chemin);
  };
  const adresse = (requete: Request | string) => new URL(typeof requete === "string" ? requete : requete.url, ORIGINE).pathname;

  it("copie les pages et leurs fichiers, saute une page qui ne vient pas", async () => {
    const sw = charger(async (requete) => site(adresse(requete)));
    const e = sw.evenement(new Request(ORIGINE + "/sw.js"));
    sw.ecouteurs.get("install")?.(e);
    await e.fini();
    const pages = await sw.cacheDe("demarche-bi-pages-v1");
    assert.deepEqual([...pages.contenu.keys()].sort(), ["/", "/demarches/ninea", "/hors-connexion/donnees.json"]);
    const fichiers = await sw.cacheDe("demarche-bi-fichiers-v1");
    assert.ok(fichiers.contenu.has("/_next/static/chunks/a.js"));
    assert.ok(fichiers.contenu.has("/_next/static/chunks/b.js"));
    assert.ok(fichiers.contenu.has("/manifest.webmanifest"));
  });
  it("échoue (et sera retenté) quand la liste des pages manque : on n'installe pas une copie vide", async () => {
    const sw = charger(horsConnexion);
    const e = sw.evenement(new Request(ORIGINE + "/sw.js"));
    sw.ecouteurs.get("install")?.(e);
    await assert.rejects(e.fini());
  });
  it("à la mise à jour, retire les fichiers que plus aucune page ne cite", async () => {
    const sw = charger(async (requete) => site(adresse(requete)));
    await (await sw.cacheDe("demarche-bi-fichiers-v1")).put("/_next/static/chunks/vieux.js", new Response("vieux"));
    const e = sw.evenement(new Request(ORIGINE + "/sw.js"));
    sw.ecouteurs.get("message")?.({ data: "rafraichir", waitUntil: e.waitUntil });
    await e.fini();
    const fichiers = await sw.cacheDe("demarche-bi-fichiers-v1");
    assert.equal(fichiers.contenu.has("/_next/static/chunks/vieux.js"), false);
    assert.ok(fichiers.contenu.has("/_next/static/chunks/a.js"));
  });
  it("à l'activation, supprime les copies des anciennes versions et seulement celles du site", async () => {
    const sw = charger(horsConnexion);
    for (const nom of ["demarche-bi-pages-v0", "demarche-bi-pages-v1", "autre-site-pages"]) await sw.cacheDe(nom);
    const e = sw.evenement(new Request(ORIGINE + "/sw.js"));
    sw.ecouteurs.get("activate")?.(e);
    await e.fini();
    assert.deepEqual([...sw.caches.keys()].sort(), ["autre-site-pages", "demarche-bi-pages-v1"]);
  });
});
