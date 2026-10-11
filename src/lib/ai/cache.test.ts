// Tests du cache en mémoire et de la limite de questions par visiteur, avec une horloge fictive. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creerCache, creerLimiteur } from "./cache";

function horloge(debut = 1_000) {
  let maintenant = debut;
  return {
    maintenant: () => maintenant,
    avancer: (ms: number) => {
      maintenant += ms;
    },
  };
}

describe("creerCache", () => {
  it("rend la valeur gardée, et rien pour une clé inconnue", () => {
    const cache = creerCache<string>({ max: 10, dureeMs: 1000 });
    cache.ecrire("a", "valeur");
    assert.equal(cache.lire("a"), "valeur");
    assert.equal(cache.lire("b"), undefined);
  });

  it("oublie une valeur après sa durée de vie", () => {
    const { maintenant, avancer } = horloge();
    const cache = creerCache<string>({ max: 10, dureeMs: 1000, maintenant });
    cache.ecrire("a", "valeur");
    avancer(999);
    assert.equal(cache.lire("a"), "valeur");
    avancer(2);
    assert.equal(cache.lire("a"), undefined);
  });

  it("renouvelle la durée de vie quand on réécrit une clé", () => {
    const { maintenant, avancer } = horloge();
    const cache = creerCache<string>({ max: 10, dureeMs: 1000, maintenant });
    cache.ecrire("a", "ancienne");
    avancer(800);
    cache.ecrire("a", "nouvelle");
    avancer(800);
    assert.equal(cache.lire("a"), "nouvelle");
  });

  it("garde au plus `max` valeurs, en oubliant les plus anciennes", () => {
    const cache = creerCache<number>({ max: 2, dureeMs: 1000 });
    cache.ecrire("a", 1);
    cache.ecrire("b", 2);
    cache.ecrire("c", 3);
    assert.equal(cache.lire("a"), undefined);
    assert.equal(cache.lire("b"), 2);
    assert.equal(cache.lire("c"), 3);
  });
});

describe("creerLimiteur", () => {
  it("autorise `max` demandes dans la fenêtre, puis refuse", () => {
    const limiteur = creerLimiteur({ max: 3, fenetreMs: 60_000 });
    assert.deepEqual([1, 2, 3, 4].map(() => limiteur.autoriser("visiteur")), [true, true, true, false]);
  });

  it("autorise de nouveau quand les demandes sortent de la fenêtre", () => {
    const { maintenant, avancer } = horloge();
    const limiteur = creerLimiteur({ max: 2, fenetreMs: 1000, maintenant });
    limiteur.autoriser("v");
    avancer(600);
    limiteur.autoriser("v");
    assert.equal(limiteur.autoriser("v"), false);
    avancer(401);
    assert.equal(limiteur.autoriser("v"), true);
  });

  it("compte chaque visiteur à part", () => {
    const limiteur = creerLimiteur({ max: 1, fenetreMs: 1000 });
    assert.equal(limiteur.autoriser("a"), true);
    assert.equal(limiteur.autoriser("a"), false);
    assert.equal(limiteur.autoriser("b"), true);
  });

  it("ne compte pas une demande refusée", () => {
    const { maintenant, avancer } = horloge();
    const limiteur = creerLimiteur({ max: 1, fenetreMs: 1000, maintenant });
    limiteur.autoriser("v");
    avancer(500);
    limiteur.autoriser("v");
    limiteur.autoriser("v");
    avancer(501);
    assert.equal(limiteur.autoriser("v"), true);
  });
});
