import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DELAI_RAFRAICHISSEMENT_MS, fautRafraichir } from "./rafraichir";

describe("fautRafraichir", () => {
  const maintenant = Date.UTC(2026, 9, 13, 12);
  it("rafraîchit quand rien n'a encore été noté", () => {
    assert.equal(fautRafraichir(null, maintenant), true);
    assert.equal(fautRafraichir(Number.NaN, maintenant), true);
  });
  it("attend une demi-journée entre deux mises à jour", () => {
    assert.equal(fautRafraichir(maintenant - 60_000, maintenant), false);
    assert.equal(fautRafraichir(maintenant - DELAI_RAFRAICHISSEMENT_MS + 1, maintenant), false);
    assert.equal(fautRafraichir(maintenant - DELAI_RAFRAICHISSEMENT_MS, maintenant), true);
  });
  it("rafraîchit quand la date notée est dans le futur (l'horloge du téléphone a changé)", () => {
    assert.equal(fautRafraichir(maintenant + 60_000, maintenant), true);
  });
});
