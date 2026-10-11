// Tests du service qui répond aux questions du site : cache des questions identiques et limite par visiteur.
// Faux modèle, aucune requête réseau. Lancer : npm test
// Les fiches ci-dessous sont des données FICTIVES de test.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creerCache } from "./cache";
import { ErreurIA } from "./client";
import { ficheDeTest } from "./fiche-de-test";
import { modeleDeTest } from "./modele-de-test";
import { creerService, visiteurDepuis } from "./service";
import type { Reponse } from "./ask";

const passeport = ficheDeTest({
  slug: "passeport",
  titre: "Passeport biométrique",
  resume: "Demande d'un passeport biométrique.",
  mots_cles: ["passeport", "voyage", "biométrique"],
  pieces: ["Un extrait de naissance"],
  etapes: ["Prendre rendez-vous."],
});
const fiches = [passeport];

const orienter = { question_claire: "Passeport ?", demarches: ["passeport"], besoin_precision: false, question_precision: "" };
const reponse = { trouve: true, intro: "Prends rendez-vous." };

function installer(modele: ReturnType<typeof modeleDeTest>["modele"] | null, autoriser: (visiteur: string) => boolean = () => true) {
  const demandes: string[] = [];
  const signalements: string[] = [];
  const service = creerService({
    fiches: () => fiches,
    modele,
    cache: creerCache<Reponse>({ max: 10, dureeMs: 60_000 }),
    limiteur: {
      autoriser: (visiteur) => {
        demandes.push(visiteur);
        return autoriser(visiteur);
      },
    },
    signaler: (etape) => signalements.push(etape),
  });
  return { service, demandes, signalements };
}

describe("creerService", () => {
  it("répond une seule fois au modèle quand la même question revient, quelle que soit sa forme", async () => {
    const { modele, appels } = modeleDeTest(orienter, reponse);
    const { service } = installer(modele);

    const premiere = await service.repondre("Passeport ?", { visiteur: "a" });
    const seconde = await service.repondre("  passeport  ? ", { visiteur: "b" });
    const accents = await service.repondre("PASSÉPORT ?", { visiteur: "c" });

    assert.equal(appels.length, 2);
    assert.equal(seconde, premiere);
    assert.equal(accents, premiere);
  });

  it("garde à part la réponse d'une démarche choisie sur l'écran de précision", async () => {
    const { modele, appels } = modeleDeTest(orienter, reponse, reponse);
    const { service } = installer(modele);

    await service.repondre("passeport", {});
    await service.repondre("passeport", { ficheSlug: "passeport" });
    await service.repondre("passeport", { ficheSlug: "passeport" });
    assert.deepEqual(
      appels.map((appel) => appel.nom),
      ["comprehension", "reponse", "reponse"],
    );
  });

  it("ne garde pas une réponse sans reformulation, pour réessayer l'IA la fois suivante", async () => {
    const panne = new ErreurIA("Panne", "indisponible");
    const { modele, appels } = modeleDeTest(panne, orienter, reponse);
    const { service, signalements } = installer(modele);

    const sansIA = await service.repondre("passeport voyage", {});
    assert.equal(sansIA.type === "fiche" ? sansIA.degrade : null, "indisponible");
    assert.deepEqual(signalements, ["comprendre"]);

    const avecIA = await service.repondre("passeport voyage", {});
    assert.equal(avecIA.type === "fiche" ? avecIA.intro : null, "Prends rendez-vous.");
    assert.equal(appels.length, 3);
  });

  it("ne compte pas dans la limite les questions déjà en mémoire", async () => {
    const { modele } = modeleDeTest(orienter, reponse);
    const { service, demandes } = installer(modele);

    await service.repondre("passeport", { visiteur: "a" });
    await service.repondre("passeport", { visiteur: "a" });
    assert.deepEqual(demandes, ["a"]);
  });

  it("répond sans l'IA, en prévenant, quand le visiteur a posé trop de questions", async () => {
    const { modele, appels } = modeleDeTest(orienter, reponse);
    const { service } = installer(modele, () => false);

    const limitee = await service.repondre("passeport voyage", { visiteur: "a" });
    assert.equal(appels.length, 0);
    assert.equal(limitee.type, "fiche");
    if (limitee.type === "fiche") {
      assert.equal(limitee.fiche.slug, "passeport");
      assert.equal(limitee.intro, null);
      assert.equal(limitee.degrade, "saturee");
    }
  });

  it("ne garde pas la réponse faite sans l'IA à cause de la limite", async () => {
    let permis = false;
    const { modele, appels } = modeleDeTest(orienter, reponse);
    const { service } = installer(modele, () => permis);

    await service.repondre("passeport voyage", { visiteur: "a" });
    permis = true;
    const ensuite = await service.repondre("passeport voyage", { visiteur: "a" });
    assert.equal(ensuite.type === "fiche" ? ensuite.intro : null, "Prends rendez-vous.");
    assert.equal(appels.length, 2);
  });

  it("ne limite pas un visiteur inconnu", async () => {
    const { modele, appels } = modeleDeTest(orienter, reponse);
    const { service, demandes } = installer(modele, () => false);

    await service.repondre("passeport", {});
    assert.deepEqual(demandes, []);
    assert.equal(appels.length, 2);
  });

  it("répond avec la recherche par mots, sans prévenir, quand l'IA n'est pas configurée", async () => {
    const { service } = installer(null);
    const sansModele = await service.repondre("passeport voyage", { visiteur: "a" });
    assert.equal(sansModele.type, "fiche");
    if (sansModele.type === "fiche") {
      assert.equal(sansModele.intro, null);
      assert.equal(sansModele.degrade, null);
    }
  });

  it("garde en mémoire un « je ne sais pas » décidé par l'IA", async () => {
    const { modele, appels } = modeleDeTest({ ...orienter, demarches: [] });
    const { service } = installer(modele);

    assert.deepEqual(await service.repondre("quel temps demain ?", {}), { type: "inconnue" });
    assert.deepEqual(await service.repondre("quel temps demain ?", {}), { type: "inconnue" });
    assert.equal(appels.length, 1);
  });
});

describe("visiteurDepuis", () => {
  it("prend la première adresse de x-forwarded-for", () => {
    assert.equal(visiteurDepuis(new Headers({ "x-forwarded-for": " 203.0.113.7 , 198.51.100.2" })), "203.0.113.7");
  });

  it("se rabat sur x-real-ip", () => {
    assert.equal(visiteurDepuis(new Headers({ "x-real-ip": "203.0.113.9" })), "203.0.113.9");
  });

  it("ne devine rien sans adresse", () => {
    assert.equal(visiteurDepuis(new Headers()), undefined);
    assert.equal(visiteurDepuis(new Headers({ "x-forwarded-for": " , " })), undefined);
  });
});
