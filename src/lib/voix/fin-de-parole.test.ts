// Tests de la fin de parole : l'enregistrement s'arrête seul quand la personne a fini. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creerDetecteurFinDeParole } from "./fin-de-parole";

const options = { seuil: 0.02, silenceMs: 1500 };

describe("creerDetecteurFinDeParole", () => {
  it("n'arrête jamais avant que la personne ait parlé", () => {
    const detecteur = creerDetecteurFinDeParole(options);
    assert.equal(detecteur.suivre(0, 0), false);
    assert.equal(detecteur.suivre(0, 10_000), false);
  });

  it("arrête après un silence assez long qui suit la parole", () => {
    const detecteur = creerDetecteurFinDeParole(options);
    detecteur.suivre(0.5, 100);
    assert.equal(detecteur.suivre(0, 1000), false);
    assert.equal(detecteur.suivre(0, 1600), true);
  });

  it("repart de zéro quand la personne reprend la parole", () => {
    const detecteur = creerDetecteurFinDeParole(options);
    detecteur.suivre(0.5, 100);
    detecteur.suivre(0, 1000);
    detecteur.suivre(0.5, 1500);
    assert.equal(detecteur.suivre(0, 2500), false);
    assert.equal(detecteur.suivre(0, 3000), true);
  });
});
