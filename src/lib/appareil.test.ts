// Tests du code anonyme du téléphone. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeAppareil, estCodeAppareil } from "./appareil";
import type { StockageLocal } from "./bienvenue";

const CODE = "3f2a9c1e-5b7d-4e8a-9c3b-1a2b3c4d5e6f";

describe("code anonyme du téléphone", () => {
  it("est créé une fois, puis toujours le même", () => {
    const notes = new Map<string, string>();
    const stockage: StockageLocal = { getItem: (c) => notes.get(c) ?? null, setItem: (c, v) => void notes.set(c, v), removeItem: (c) => void notes.delete(c) };
    assert.equal(codeAppareil(stockage, () => CODE), CODE);
    assert.equal(codeAppareil(stockage, () => "autre"), CODE);
  });
  it("sans mémoire : pas de code, sans planter", () => {
    assert.equal(codeAppareil(undefined), undefined);
    const bloquee: StockageLocal = { getItem: () => { throw new Error("bloquée"); }, setItem: () => undefined, removeItem: () => undefined };
    assert.equal(codeAppareil(bloquee), undefined);
  });
  it("le serveur refuse ce qui n'est pas un code", () => {
    assert.equal(estCodeAppareil(CODE), true);
    for (const v of ["tamsir@exemple.sn", "771234567", "", null, 3]) assert.equal(estCodeAppareil(v), false);
  });
});
