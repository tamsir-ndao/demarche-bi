// Tests de l'accès au back-office. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creerJeton, DUREE_SESSION_S, jetonValide, motDePasseValide } from "./session";

const T = 1_800_000_000_000;

describe("accès au back-office", () => {
  it("n'accepte que le bon mot de passe, et personne sans mot de passe réglé", () => {
    assert.equal(motDePasseValide("exemple", "exemple"), true);
    assert.equal(motDePasseValide("autre", "exemple"), false);
    assert.equal(motDePasseValide("", undefined), false);
    assert.equal(motDePasseValide("", ""), false);
  });
  it("accepte son jeton jusqu'à l'expiration", () => {
    const jeton = creerJeton("exemple", T);
    assert.equal(jetonValide(jeton, "exemple", T + 1000), true);
    assert.equal(jetonValide(jeton, "exemple", T + DUREE_SESSION_S * 1000), false);
  });
  it("refuse un jeton modifié, d'un autre mot de passe, ou absent", () => {
    const jeton = creerJeton("exemple", T);
    const [expiration, signee] = jeton.split(".");
    assert.equal(jetonValide(`${Number(expiration) + 999}.${signee}`, "exemple", T), false);
    assert.equal(jetonValide(jeton, "autre", T), false);
    assert.equal(jetonValide(undefined, "exemple", T), false);
    assert.equal(jetonValide("n'importe.quoi", "exemple", T), false);
    assert.equal(jetonValide(jeton, undefined, T), false);
  });
});
