// Tests des données du mode sans connexion. Les fiches ci-dessous sont des données FICTIVES de test. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ficheDeTest } from "../ai/fiche-de-test";
import { searchFiches } from "../fiches/search";
import { donneesHorsConnexion } from "./construire";
import { lireDonnees, PAGE_HORS_CONNEXION, pagesAGarder, URL_DONNEES } from "./donnees";

const fiches = [
  ficheDeTest({ slug: "passeport", titre: "Passeport biométrique", cout: "10 000 FCFA", delai: "Environ 2 semaines", mots_cles: ["passeport"] }),
  ficheDeTest({ slug: "casier", titre: "Casier judiciaire", mots_cles: ["casier"] }),
];

describe("pagesAGarder", () => {
  it("liste l'accueil, les démarches, chaque fiche visible, les pages d'information et la page « hors connexion »", () => {
    assert.deepEqual(pagesAGarder(fiches), [
      "/",
      "/demarches",
      "/demarches/passeport",
      "/demarches/casier",
      "/projet",
      "/a-propos",
      PAGE_HORS_CONNEXION,
    ]);
  });
  it("ne garde aucune page de réponse ni d'API", () => {
    assert.ok(pagesAGarder(fiches).every((chemin) => !chemin.startsWith("/reponse") && !chemin.startsWith("/api")));
  });
});

describe("donneesHorsConnexion", () => {
  it("donne les pages, les fiches et une carte par fiche avec son coût et son délai", () => {
    const donnees = donneesHorsConnexion(fiches);
    assert.equal(donnees.fiches.length, 2);
    assert.deepEqual(donnees.cartes[0], {
      slug: "passeport",
      titre: "Passeport biométrique",
      detail: "10 000 FCFA · environ 2 semaines",
      categorie: "autre",
    });
    assert.equal(donnees.cartes[1].detail, "Coût et délai non précisés");
    assert.equal(URL_DONNEES, "/hors-connexion/donnees.json");
  });
  it("survit au passage par le JSON (c'est ainsi que le téléphone les reçoit) et reste cherchable par mots", () => {
    const recu = lireDonnees(JSON.parse(JSON.stringify(donneesHorsConnexion(fiches))));
    assert.ok(recu);
    const [meilleur] = searchFiches(recu.fiches, "Comment faire mon passeport ?", { inclureBrouillons: true });
    assert.equal(meilleur.fiche.slug, "passeport");
    assert.deepEqual(searchFiches(recu.fiches, "la météo à Dakar", { inclureBrouillons: true }), []);
  });
});

describe("lireDonnees", () => {
  it("refuse ce qui n'a pas la bonne forme", () => {
    for (const abime of [null, undefined, "texte", 12, [], {}, { fiches: "x", cartes: [] }, { fiches: [], cartes: {} }]) {
      assert.equal(lireDonnees(abime), null, JSON.stringify(abime));
    }
  });
  it("écarte les fiches et les cartes abîmées, garde les bonnes", () => {
    const brut = {
      fiches: [fiches[0], { slug: "sans-titre" }, null, "x", { ...fiches[1], etapes: "pas une liste" }],
      cartes: [{ slug: "a", titre: "A", detail: "d", categorie: "autre" }, { slug: "b" }, 3],
    };
    const lu = lireDonnees(brut);
    assert.deepEqual(lu?.fiches.map((f) => f.slug), ["passeport"]);
    assert.deepEqual(lu?.cartes.map((c) => c.slug), ["a"]);
  });
});
