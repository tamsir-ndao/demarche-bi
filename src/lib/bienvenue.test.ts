// Tests de la présentation « Bienvenue » : trois paliers, montrée une fois, ou sur demande. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aDejaVu,
  CLE_BIENVENUE,
  fautMontrer,
  marquerVue,
  PALIERS,
  presentationDemandee,
  SCRIPT_BIENVENUE,
  stockageLocal,
  type StockageLocal,
} from "./bienvenue";

function faux(): StockageLocal & { valeurs: Map<string, string> } {
  const valeurs = new Map<string, string>();
  return {
    valeurs,
    getItem: (cle) => valeurs.get(cle) ?? null,
    setItem: (cle, valeur) => void valeurs.set(cle, valeur),
    removeItem: (cle) => void valeurs.delete(cle),
  };
}

const casse: StockageLocal = {
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

describe("les paliers", () => {
  it("sont exactement trois, dans l'ordre, avec leurs icônes", () => {
    assert.equal(PALIERS.length, 3);
    assert.deepEqual(
      PALIERS.map((palier) => palier.titre),
      ["Pose ta question", "Une réponse avec ses sources", "Je ne devine pas"],
    );
    assert.deepEqual(
      PALIERS.map((palier) => palier.icone),
      ["micro", "dossier", "bouclier"],
    );
  });
  it("ont chacun un texte court", () => {
    for (const palier of PALIERS) {
      assert.ok(palier.texte.length > 0 && palier.texte.length <= 120, palier.titre);
    }
  });
});

describe("aDejaVu et marquerVue", () => {
  it("rien n'est vu au départ ; après marquerVue, c'est vu", () => {
    const stockage = faux();
    assert.equal(aDejaVu(stockage), false);
    marquerVue(stockage);
    assert.equal(aDejaVu(stockage), true);
    assert.equal(stockage.valeurs.get(CLE_BIENVENUE), "1");
  });
  it("sans stockage : pas vu, et marquer ne plante pas", () => {
    marquerVue(undefined);
    assert.equal(aDejaVu(undefined), false);
  });
  it("stockage bloqué : pas vu, et marquer ne plante pas", () => {
    marquerVue(casse);
    assert.equal(aDejaVu(casse), false);
  });
});

describe("fautMontrer", () => {
  it("au premier lancement : oui ; après l'avoir vue : non", () => {
    const stockage = faux();
    assert.equal(fautMontrer({ stockage, recherche: "" }), true);
    marquerVue(stockage);
    assert.equal(fautMontrer({ stockage, recherche: "" }), false);
  });
  it("« ?presentation » et « ?presentation=1 » forcent l'ouverture, même déjà vue", () => {
    const stockage = faux();
    marquerVue(stockage);
    assert.equal(fautMontrer({ stockage, recherche: "?presentation" }), true);
    assert.equal(fautMontrer({ stockage, recherche: "?presentation=1" }), true);
    assert.equal(fautMontrer({ stockage, recherche: "presentation" }), true);
    assert.equal(fautMontrer({ stockage: undefined, recherche: "?presentation" }), true);
  });
  it("un autre paramètre ne force rien", () => {
    const stockage = faux();
    marquerVue(stockage);
    assert.equal(fautMontrer({ stockage, recherche: "?q=carte" }), false);
    assert.equal(fautMontrer({ stockage, recherche: "?presentations" }), false);
  });
  it("stockage absent ou bloqué : non (on ne peut pas se souvenir de l'avoir montrée)", () => {
    assert.equal(fautMontrer({ stockage: undefined, recherche: "" }), false);
    assert.equal(fautMontrer({ stockage: casse, recherche: "" }), false);
  });
});

describe("presentationDemandee", () => {
  it("lit le paramètre avec ou sans point d'interrogation", () => {
    assert.equal(presentationDemandee("?presentation"), true);
    assert.equal(presentationDemandee("?a=1&presentation=1"), true);
    assert.equal(presentationDemandee(""), false);
  });
});

describe("stockageLocal", () => {
  it("n'existe pas hors du navigateur", () => {
    assert.equal(stockageLocal(), undefined);
  });
});

/** Joue le script comme le navigateur avant le premier dessin ; rend la valeur de `data-bienvenue` sur <html>. */
function jouerScript({ chemin = "/", recherche = "", memoire = new Map<string, string>(), memoireBloquee = false } = {}) {
  const attributs = new Map<string, string>();
  const document = { documentElement: { setAttribute: (nom: string, valeur: string) => attributs.set(nom, valeur) } };
  const location = { pathname: chemin, search: recherche };
  const localStorage = {
    getItem: (cle: string) => {
      if (memoireBloquee) throw new Error("bloquée");
      return memoire.get(cle) ?? null;
    },
  };
  new Function("document", "location", "localStorage", SCRIPT_BIENVENUE)(document, location, localStorage);
  return attributs.get("data-bienvenue");
}

describe("script de la présentation (avant le premier dessin)", () => {
  it("cache l'accueil au premier lancement, en attendant la présentation", () => {
    assert.equal(jouerScript(), "attendue");
  });
  it("ne cache rien quand la présentation a déjà été vue", () => {
    assert.equal(jouerScript({ memoire: new Map([[CLE_BIENVENUE, "1"]]) }), undefined);
  });
  it("cache l'accueil quand l'adresse demande la présentation, même déjà vue", () => {
    assert.equal(jouerScript({ recherche: "?presentation", memoire: new Map([[CLE_BIENVENUE, "1"]]) }), "attendue");
  });
  it("ne cache rien quand la mémoire est bloquée (la présentation ne s'ouvrira pas)", () => {
    assert.equal(jouerScript({ memoireBloquee: true }), undefined);
  });
  it("ne cache rien sur les autres pages (la présentation n'existe que sur l'accueil)", () => {
    assert.equal(jouerScript({ chemin: "/demarches" }), undefined);
  });
  it("ne dépend que du navigateur (document, location, localStorage)", () => {
    assert.doesNotThrow(() => new Function("document", "location", "localStorage", SCRIPT_BIENVENUE));
    assert.ok(!SCRIPT_BIENVENUE.includes("</script"));
  });
});
