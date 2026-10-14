// Tests de robustesse de bout en bout : le VRAI client de chat (cascade des trois modèles de Groq, `chatJson`, validation
// Zod) branché sur un faux `fetch`, derrière le parcours d'une question et le service (mémoire, limite par visiteur).
// Aucune requête réseau, aucune attente réelle (un délai dépassé est un rejet immédiat), horloge simulée.
// Ce que client.test.ts, ask.test.ts, service.test.ts et cache.test.ts couvrent chacun à part n'est pas refait :
// ici, seulement le branchement. Les fiches sont des données FICTIVES ; la clé est une valeur de test. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { creerJournal, entreeDeLaReponse } from "../avis/journal";
import { poserQuestion, type Reponse } from "./ask";
import { creerCache, creerLimiteur } from "./cache";
import { ErreurIA } from "./client";
import { getChatProviders, MODELE_PRINCIPAL, MODELE_SECOURS, MODELE_TROISIEME } from "./config";
import { ficheDeTest } from "./fiche-de-test";
import { creerService, visiteurDepuis } from "./service";
import { chatJson, type Modele } from "./structured";

type Fetch = typeof fetch;
type ReponseFiche = Extract<Reponse, { type: "fiche" }>;

const CLE = "clé-de-test";

const carte = ficheDeTest({
  slug: "carte",
  titre: "Carte d'identité nationale",
  resume: "Demande de la carte d'identité.",
  mots_cles: ["carte", "identité", "CNI"],
  pieces: ["Un extrait de naissance"],
  etapes: ["Se rendre au commissariat de police."],
});
const duplicata = ficheDeTest({
  slug: "duplicata",
  titre: "Duplicata de la carte d'identité",
  resume: "Refaire la carte d'identité perdue.",
  mots_cles: ["duplicata", "carte", "identité", "perdue"],
  etapes: ["Obtenir un certificat de perte."],
});
const passeport = ficheDeTest({
  slug: "passeport",
  titre: "Passeport biométrique",
  resume: "Demande d'un passeport biométrique.",
  mots_cles: ["passeport", "voyage", "biométrique"],
  pieces: ["Un extrait de naissance"],
  etapes: ["Prendre rendez-vous."],
  cout: "Timbre de 1 234 FCFA",
});
const fiches = [carte, duplicata, passeport];

const QUESTION = "Combien coûte le passeport ?";
const SANS_RAPPORT = "Quelle est la recette du thiéboudienne ?";

// --- Le faux fetch -------------------------------------------------------------------------------------------------

const CorpsDeLaRequete = z.object({
  model: z.string(),
  response_format: z.object({ json_schema: z.object({ name: z.string() }) }),
});

/** Ce qu'un appel HTTP au fournisseur contient d'utile : le modèle demandé, le schéma (« comprehension » ou « reponse »), la clé envoyée. */
type AppelHttp = { modele: string; schema: string; autorisation: string | null };

/** Ce que le fournisseur fait de l'appel (numéroté à partir de 1, tous modèles confondus) : une réponse, ou une panne qui lève. */
type Scenario = (appel: AppelHttp, numero: number) => Response | Error;

function fauxFetch(depart: Scenario) {
  const appels: AppelHttp[] = [];
  let scenario = depart;
  const fetchFictif: Fetch = async (_url, init) => {
    const corps = CorpsDeLaRequete.parse(JSON.parse(String(init?.body)));
    const appel: AppelHttp = {
      modele: corps.model,
      schema: corps.response_format.json_schema.name,
      autorisation: new Headers(init?.headers).get("authorization"),
    };
    appels.push(appel);
    const suite = scenario(appel, appels.length);
    if (suite instanceof Error) throw suite;
    return suite;
  };
  return {
    fetch: fetchFictif,
    appels,
    /** Change ce que fait le fournisseur à partir du prochain appel (la panne passe, par exemple). */
    changer: (suivant: Scenario) => {
      scenario = suivant;
    },
  };
}

const completion = (objet: unknown) => Response.json({ choices: [{ message: { content: JSON.stringify(objet) } }] });
/** Un fournisseur qui refuse et cite la clé dans son message : le client ne doit rien en garder. */
const erreurHttp = (statut: number) => Response.json({ error: { message: `refusé pour la clé ${CLE}` } }, { status: statut });
/** Ce que lève `AbortSignal.timeout` : tout de suite ici, pas de vraie attente de 6 ou 8 secondes. */
const delaiDepasse = () => new DOMException("The operation was aborted due to timeout", "TimeoutError");
/** Une erreur réseau dont le message recopie l'en-tête d'autorisation (certaines bibliothèques le font). */
const panneReseau = () => new Error(`connexion coupée (Authorization: Bearer ${CLE})`);

const toujours =
  (suite: () => Response | Error): Scenario =>
  () =>
    suite();

const comprehensionPasseport = {
  question_claire: QUESTION,
  demarches: ["passeport"],
  besoin_precision: false,
  question_precision: "",
  hors_domaine: false,
  message_hors_domaine: "",
  message_absente: "",
};
const reponsePasseport = { trouve: true, intro: "Le passeport coûte un timbre de 1 234 FCFA." };

/** Le fournisseur en bonne santé : il comprend la question puis écrit l'introduction du passeport. */
const enBonneSante: Scenario = (appel) => completion(appel.schema === "comprehension" ? comprehensionPasseport : reponsePasseport);

// --- Le montage ----------------------------------------------------------------------------------------------------

/** Le modèle du site : le vrai `chatJson` avec la cascade de Groq que construit `getChatProviders` pour cette clé. */
function modeleReel(appeler: Fetch): Modele {
  const providers = getChatProviders({ AI_API_KEY: CLE });
  return (appel) => chatJson(appel, { providers, fetch: appeler });
}

const ordreDesModeles = [MODELE_PRINCIPAL, MODELE_SECOURS, MODELE_TROISIEME];

function ficheMontree(reponse: Reponse): ReponseFiche {
  if (reponse.type !== "fiche") assert.fail(`Une fiche était attendue, reçu : ${reponse.type}`);
  return reponse;
}

function erreurIA(erreur: unknown): ErreurIA {
  if (!(erreur instanceof ErreurIA)) assert.fail(`ErreurIA attendue, reçu : ${String(erreur)}`);
  return erreur;
}

/** Le service du site avec le vrai modèle sur faux fetch, la vraie mémoire et la vraie limite (10 par minute, comme serveur.ts). */
function installer(scenario: Scenario) {
  const reseau = fauxFetch(scenario);
  let maintenant = 1_000_000;
  const signalements: [string, unknown][] = [];
  const service = creerService({
    fiches: () => fiches,
    modele: modeleReel(reseau.fetch),
    cache: creerCache<Reponse>({ max: 300, dureeMs: 6 * 60 * 60 * 1000, maintenant: () => maintenant }),
    // Mêmes valeurs que `repondreALaQuestion` dans serveur.ts (elles n'y sont pas exportées).
    limiteur: creerLimiteur({ max: 10, fenetreMs: 60_000, maintenant: () => maintenant }),
    signaler: (etape, erreur) => signalements.push([etape, erreur]),
  });
  return {
    ...reseau,
    service,
    signalements,
    avancer: (ms: number) => {
      maintenant += ms;
    },
  };
}

// --- Les pannes de l'IA --------------------------------------------------------------------------------------------

describe("pannes de l'IA, avec la cascade réelle des trois modèles", () => {
  it("429 sur les trois modèles : la fiche la plus proche, sans introduction, prévenue « saturée », jamais une fiche inventée", async () => {
    const { fetch, appels } = fauxFetch(toujours(() => erreurHttp(429)));
    const signalements: [string, unknown][] = [];

    const reponse = ficheMontree(
      await poserQuestion(QUESTION, {
        fiches,
        modele: modeleReel(fetch),
        signaler: (etape, erreur) => signalements.push([etape, erreur]),
      }),
    );

    assert.equal(reponse.fiche, passeport);
    assert.equal(reponse.intro, null);
    assert.equal(reponse.degrade, "saturee");
    assert.equal(reponse.rejet, null);
    // Rien ne vient d'ailleurs que des fiches du site.
    assert.ok(fiches.includes(reponse.fiche));
    assert.ok(reponse.autres.every((autre) => fiches.includes(autre)));
    // Les trois modèles ont été essayés, dans l'ordre, pour la seule étape « comprendre » (l'étape « répondre » n'a pas lieu).
    assert.deepEqual(
      appels.map((appel) => [appel.modele, appel.schema]),
      ordreDesModeles.map((modele) => [modele, "comprehension"]),
    );
    assert.deepEqual(
      signalements.map(([etape]) => etape),
      ["comprendre"],
    );
    assert.equal(erreurIA(signalements[0][1]).nature, "saturee");
  });

  it("429, puis délai dépassé, puis succès : les trois modèles sont essayés dans l'ordre, et l'introduction est montrée", async () => {
    const { fetch, appels } = fauxFetch((appel, numero) => {
      if (numero === 1) return erreurHttp(429);
      if (numero === 2) return delaiDepasse();
      return enBonneSante(appel, numero);
    });
    const signalements: [string, unknown][] = [];

    const reponse = ficheMontree(
      await poserQuestion(QUESTION, {
        fiches,
        modele: modeleReel(fetch),
        signaler: (etape, erreur) => signalements.push([etape, erreur]),
      }),
    );

    assert.equal(reponse.fiche, passeport);
    assert.equal(reponse.intro, reponsePasseport.intro);
    assert.equal(reponse.degrade, null);
    // « comprendre » : gpt-oss-120b (429), qwen3.8-27b (délai), gpt-oss-20b (succès). « répondre » repart du premier modèle.
    assert.deepEqual(
      appels.map((appel) => [appel.modele, appel.schema]),
      [
        [MODELE_PRINCIPAL, "comprehension"],
        [MODELE_SECOURS, "comprehension"],
        [MODELE_TROISIEME, "comprehension"],
        [MODELE_PRINCIPAL, "reponse"],
      ],
    );
    // Un fournisseur qui a échoué avant un succès n'est pas une panne : rien n'est signalé.
    assert.deepEqual(signalements, []);
  });

  it("panne réseau complète et aucune fiche proche : « je ne sais pas », jamais une fiche au hasard", async () => {
    const { fetch, appels } = fauxFetch(toujours(panneReseau));
    const signalements: [string, unknown][] = [];

    const reponse = await poserQuestion(SANS_RAPPORT, {
      fiches,
      modele: modeleReel(fetch),
      signaler: (etape, erreur) => signalements.push([etape, erreur]),
    });

    assert.deepEqual(reponse, { type: "inconnue" });
    assert.equal(appels.length, 3);
    assert.equal(signalements.length, 1);
    assert.equal(erreurIA(signalements[0][1]).nature, "indisponible");
  });

  it("429, 429 puis une panne réseau : l'IA est « indisponible » et non « saturée »", async () => {
    const { fetch } = fauxFetch((_appel, numero) => (numero <= 2 ? erreurHttp(429) : panneReseau()));
    const signalements: [string, unknown][] = [];

    const reponse = ficheMontree(
      await poserQuestion(QUESTION, {
        fiches,
        modele: modeleReel(fetch),
        signaler: (etape, erreur) => signalements.push([etape, erreur]),
      }),
    );

    assert.equal(reponse.fiche, passeport);
    assert.equal(reponse.intro, null);
    assert.equal(reponse.degrade, "indisponible");
    assert.deepEqual(erreurIA(signalements[0][1]).details, [
      "principal : HTTP 429",
      "secours : HTTP 429",
      "troisieme : erreur réseau",
    ]);
  });

  it("l'IA qui tombe entre « comprendre » et « répondre » : la fiche choisie est montrée sans introduction", async () => {
    const { fetch, appels } = fauxFetch((appel, numero) => (numero === 1 ? enBonneSante(appel, numero) : erreurHttp(429)));
    const signalements: [string, unknown][] = [];

    const reponse = ficheMontree(
      await poserQuestion(QUESTION, {
        fiches,
        modele: modeleReel(fetch),
        signaler: (etape, erreur) => signalements.push([etape, erreur]),
      }),
    );

    assert.equal(reponse.fiche, passeport);
    assert.equal(reponse.intro, null);
    assert.equal(reponse.degrade, "saturee");
    assert.equal(appels.length, 4);
    assert.deepEqual(
      signalements.map(([etape]) => etape),
      ["repondre"],
    );
  });

  it("une panne n'est pas mise en mémoire : quand l'IA revient, la même question reçoit son introduction", async () => {
    const { service, changer, appels, signalements } = installer(toujours(() => erreurHttp(429)));

    const pendantLaPanne = ficheMontree(await service.repondre(QUESTION, { visiteur: "203.0.113.7" }));
    assert.equal(pendantLaPanne.intro, null);
    assert.equal(pendantLaPanne.degrade, "saturee");
    assert.equal(appels.length, 3);

    changer(enBonneSante);
    const apres = ficheMontree(await service.repondre(QUESTION, { visiteur: "203.0.113.7" }));
    assert.equal(apres.intro, reponsePasseport.intro);
    assert.equal(apres.degrade, null);
    assert.equal(appels.length, 5);

    // Et la bonne réponse, elle, est gardée.
    assert.equal(await service.repondre(QUESTION, { visiteur: "203.0.113.7" }), apres);
    assert.equal(appels.length, 5);
    assert.equal(signalements.length, 1);
  });
});

// --- La clé ---------------------------------------------------------------------------------------------------------

describe("la clé de l'API", () => {
  it("n'apparaît ni dans les erreurs, ni dans les signalements, ni dans la réponse, ni dans le journal, même citée par le fournisseur", async () => {
    // 1er modèle : refus qui cite la clé ; 2e : erreur réseau qui recopie l'en-tête ; 3e : erreur du serveur qui cite la clé.
    const { service, signalements, appels } = installer((_appel, numero) => {
      if (numero % 3 === 1) return erreurHttp(401);
      if (numero % 3 === 2) return panneReseau();
      return erreurHttp(500);
    });

    const reponse = await service.repondre(QUESTION, { visiteur: "203.0.113.7" });

    // La clé a bien été envoyée aux trois modèles : l'absence plus bas n'est pas un hasard.
    assert.equal(appels.length, 3);
    assert.ok(appels.every((appel) => appel.autorisation === `Bearer ${CLE}`));

    assert.equal(signalements.length, 1);
    const erreur = erreurIA(signalements[0][1]);
    const toutCeQuiSeraitEcrit = [
      erreur.message,
      erreur.name,
      erreur.nature,
      ...erreur.details,
      // Ce que serveur.ts met dans les journaux du serveur.
      `[ia] ${signalements[0][0]} : ${erreur.nature} (${erreur.details.join(" ; ")})`,
      String(erreur),
      erreur.stack ?? "",
      JSON.stringify(erreur),
    ].join("\n");
    assert.equal(toutCeQuiSeraitEcrit.includes(CLE), false, toutCeQuiSeraitEcrit);
    assert.deepEqual(erreur.details, ["principal : HTTP 401", "secours : erreur réseau", "troisieme : HTTP 500"]);
    assert.equal(JSON.stringify(reponse).includes(CLE), false);

    // Le journal anonyme : ce qui part vers la base ne contient pas la clé non plus.
    const ecrits: unknown[][] = [];
    const journal = creerJournal({
      requete: async (texte, valeurs) => {
        ecrits.push([texte, ...valeurs]);
      },
    });
    const entree = entreeDeLaReponse(QUESTION, reponse);
    assert.ok(entree !== null);
    assert.equal(await journal.noterReponse("00000000-0000-4000-8000-000000000000", entree), true);
    assert.equal(ecrits.length, 1);
    assert.equal(JSON.stringify(ecrits).includes(CLE), false);
  });
});

// --- La limite par visiteur ------------------------------------------------------------------------------------------

describe("limite de 10 questions par minute et par adresse, avec une horloge simulée", () => {
  const demander = (service: ReturnType<typeof installer>["service"], numero: number, visiteur: string | undefined) =>
    service.repondre(`passeport essai ${numero}`, { visiteur });

  it("refuse la onzième question sans appeler le modèle, laisse une autre adresse tranquille, puis oublie la minute écoulée", async () => {
    const { service, appels, avancer } = installer(enBonneSante);

    // Dix questions différentes de la même adresse : toutes passent par le modèle (comprendre + répondre).
    for (let numero = 1; numero <= 10; numero += 1) {
      assert.equal(ficheMontree(await demander(service, numero, "203.0.113.7")).intro, reponsePasseport.intro);
    }
    assert.equal(appels.length, 20);

    // La onzième : la fiche sans introduction, « saturée », et aucun appel de plus.
    const refusee = ficheMontree(await demander(service, 11, "203.0.113.7"));
    assert.equal(refusee.fiche, passeport);
    assert.equal(refusee.intro, null);
    assert.equal(refusee.degrade, "saturee");
    assert.equal(appels.length, 20);

    // Une autre adresse n'est pas touchée.
    assert.equal(ficheMontree(await demander(service, 12, "198.51.100.2")).intro, reponsePasseport.intro);
    assert.equal(appels.length, 22);

    // Toujours refusée au milieu de la minute, puis de nouveau servie quand la fenêtre s'est vidée.
    avancer(30_000);
    assert.equal(ficheMontree(await demander(service, 13, "203.0.113.7")).degrade, "saturee");
    assert.equal(appels.length, 22);
    avancer(31_000);
    assert.equal(ficheMontree(await demander(service, 14, "203.0.113.7")).intro, reponsePasseport.intro);
    assert.equal(appels.length, 24);
  });

  it("ne garde pas en mémoire la réponse refusée par la limite : elle sera refaite avec l'IA plus tard", async () => {
    const { service, appels, avancer } = installer(enBonneSante);
    for (let numero = 1; numero <= 10; numero += 1) await demander(service, numero, "203.0.113.7");

    assert.equal(ficheMontree(await demander(service, 11, "203.0.113.7")).degrade, "saturee");
    avancer(61_000);
    const plusTard = ficheMontree(await demander(service, 11, "203.0.113.7"));

    assert.equal(plusTard.intro, reponsePasseport.intro);
    assert.equal(appels.length, 22);
  });

  it("compte les questions par première adresse de x-forwarded-for", async () => {
    const { service, appels } = installer(enBonneSante);
    // Vercel écrit cet en-tête avec l'adresse réelle du visiteur en premier : c'est elle qui sert de clé. Ailleurs (autre
    // hébergeur, serveur local sans proxy), c'est le client qui écrit l'en-tête : il peut changer la première valeur à
    // chaque question et échapper à la limite. Elle protège le quota du modèle sur Vercel, elle n'est pas une barrière.
    const entetes = (valeur: string) => new Headers({ "x-forwarded-for": valeur });

    assert.equal(visiteurDepuis(entetes("203.0.113.7, 198.51.100.2")), "203.0.113.7");
    for (let numero = 1; numero <= 10; numero += 1) {
      const visiteur = visiteurDepuis(entetes(`203.0.113.7, 192.0.2.${numero}`));
      assert.equal(ficheMontree(await demander(service, numero, visiteur)).intro, reponsePasseport.intro);
    }

    // Même première adresse, autre adresse derrière : c'est le même visiteur.
    const refusee = ficheMontree(await demander(service, 11, visiteurDepuis(entetes("203.0.113.7, 192.0.2.99"))));
    assert.equal(refusee.degrade, "saturee");
    // L'adresse qui n'était qu'en seconde position est un autre visiteur.
    const autre = ficheMontree(await demander(service, 12, visiteurDepuis(entetes("198.51.100.2"))));
    assert.equal(autre.intro, reponsePasseport.intro);
    assert.equal(appels.length, 22);
  });

  it("ne limite personne quand aucune adresse n'est connue (en-têtes absents)", async () => {
    const { service, appels } = installer(enBonneSante);
    const visiteur = visiteurDepuis(new Headers());
    assert.equal(visiteur, undefined);

    for (let numero = 1; numero <= 12; numero += 1) {
      assert.equal(ficheMontree(await demander(service, numero, visiteur)).intro, reponsePasseport.intro);
    }
    assert.equal(appels.length, 24);
  });
});

// --- La mémoire des questions ----------------------------------------------------------------------------------------

describe("mémoire des questions, avec le vrai client", () => {
  it("la même question, écrite avec une autre casse, d'autres accents ou d'autres espaces, rend la même réponse sans appeler le modèle", async () => {
    const { service, appels } = installer(enBonneSante);

    const premiere = ficheMontree(await service.repondre("Combien coûte le passeport ?", { visiteur: "203.0.113.7" }));
    assert.equal(premiere.intro, reponsePasseport.intro);
    assert.equal(appels.length, 2);

    for (const variante of [
      "COMBIEN COÛTE LE PASSEPORT ?",
      "combien coute le passeport ?",
      "  Combien   coûte le passeport ?  ",
      "Combien Coûte Le Pàsseport ?",
    ]) {
      assert.equal(await service.repondre(variante, { visiteur: "198.51.100.2" }), premiere, variante);
    }
    assert.equal(appels.length, 2);
  });

  it("une question vraiment différente n'est pas confondue avec la première", async () => {
    const { service, appels } = installer(enBonneSante);

    await service.repondre("Combien coûte le passeport ?", {});
    await service.repondre("Où demander le passeport ?", {});

    assert.equal(appels.length, 4);
  });
});
