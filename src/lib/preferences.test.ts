// Tests des réglages de la personne. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockageLocal } from "./bienvenue";
import { appareilExclu, choisirAppareilExclu, choisirVoixAutomatique, voixAutomatique } from "./preferences";

describe("appareil de test", () => {
  it("est compté par défaut, s'exclut et se réintègre", () => {
    const notes = new Map<string, string>();
    const stockage: StockageLocal = {
      getItem: (cle) => notes.get(cle) ?? null,
      setItem: (cle, valeur) => void notes.set(cle, valeur),
      removeItem: (cle) => void notes.delete(cle),
    };
    assert.equal(appareilExclu(stockage), false);
    choisirAppareilExclu(stockage, true);
    assert.equal(appareilExclu(stockage), true);
    choisirAppareilExclu(stockage, false);
    assert.equal(appareilExclu(stockage), false);
    assert.equal(appareilExclu(undefined), false);
  });
});

describe("lecture automatique à voix haute", () => {
  it("est active par défaut, se coupe et se rallume", () => {
    const notes = new Map<string, string>();
    const stockage: StockageLocal = {
      getItem: (cle) => notes.get(cle) ?? null,
      setItem: (cle, valeur) => void notes.set(cle, valeur),
      removeItem: (cle) => void notes.delete(cle),
    };
    assert.equal(voixAutomatique(stockage), true);
    choisirVoixAutomatique(stockage, false);
    assert.equal(voixAutomatique(stockage), false);
    choisirVoixAutomatique(stockage, true);
    assert.equal(voixAutomatique(stockage), true);
  });
  it("reste active sans mémoire", () => {
    assert.equal(voixAutomatique(undefined), true);
  });
});
