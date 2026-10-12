// Tests de la lecture automatique : on ne lit tout seul que la réponse à une question posée à voix haute. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLE_LECTURE_AUTO,
  consommerLaDemande,
  demanderLaLecture,
  DUREE_DEMANDE_MS,
  stockageDeLOnglet,
  type StockageSession,
} from "./lectureAuto";

function faux(): StockageSession & { valeurs: Map<string, string> } {
  const valeurs = new Map<string, string>();
  return {
    valeurs,
    getItem: (cle) => valeurs.get(cle) ?? null,
    setItem: (cle, valeur) => void valeurs.set(cle, valeur),
    removeItem: (cle) => void valeurs.delete(cle),
  };
}

const casse: StockageSession = {
  getItem: () => {
    throw new Error("stockage bloqué");
  },
  setItem: () => {
    throw new Error("stockage bloqué");
  },
  removeItem: () => {
    throw new Error("stockage bloqué");
  },
};

describe("lecture automatique", () => {
  it("la demande faite à voix haute donne une lecture, une seule fois", () => {
    const stockage = faux();
    demanderLaLecture(stockage, 1_000);
    assert.equal(consommerLaDemande(stockage, 2_000), true);
    assert.equal(consommerLaDemande(stockage, 2_001), false);
  });
  it("ne lit rien sans demande", () => {
    assert.equal(consommerLaDemande(faux(), 1_000), false);
  });
  it("garde l'heure de la demande sous la clé prévue", () => {
    const stockage = faux();
    demanderLaLecture(stockage, 1_234);
    assert.equal(stockage.valeurs.get(CLE_LECTURE_AUTO), "1234");
  });
  it("laisse 90 secondes pour que la réponse arrive, pas une de plus", () => {
    assert.equal(DUREE_DEMANDE_MS, 90_000);
    const juste = faux();
    demanderLaLecture(juste, 0);
    assert.equal(consommerLaDemande(juste, DUREE_DEMANDE_MS - 1), true);
    const trop = faux();
    demanderLaLecture(trop, 0);
    assert.equal(consommerLaDemande(trop, DUREE_DEMANDE_MS), false);
  });
  it("oublie une demande trop ancienne même quand elle ne sert pas", () => {
    const stockage = faux();
    demanderLaLecture(stockage, 0);
    consommerLaDemande(stockage, DUREE_DEMANDE_MS + 5_000);
    assert.equal(stockage.valeurs.has(CLE_LECTURE_AUTO), false);
  });
  it("ignore une heure dans le futur (horloge changée) et une valeur qui n'est pas un nombre", () => {
    const futur = faux();
    demanderLaLecture(futur, 50_000);
    assert.equal(consommerLaDemande(futur, 1_000), false);
    const bizarre = faux();
    bizarre.valeurs.set(CLE_LECTURE_AUTO, "demain");
    assert.equal(consommerLaDemande(bizarre, 1_000), false);
    assert.equal(bizarre.valeurs.has(CLE_LECTURE_AUTO), false);
  });
  it("ne plante jamais quand le stockage est bloqué ou absent", () => {
    demanderLaLecture(casse, 1);
    assert.equal(consommerLaDemande(casse, 1), false);
    demanderLaLecture(undefined, 1);
    assert.equal(consommerLaDemande(undefined, 1), false);
  });
});

describe("stockageDeLOnglet", () => {
  it("n'existe pas hors du navigateur", () => {
    assert.equal(stockageDeLOnglet(), undefined);
  });
});
