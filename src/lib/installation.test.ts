// Tests du message « Installe Démarche-Bi » : quand l'afficher et se souvenir d'un refus. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  choisirMessage,
  CLE_REJET,
  DUREE_SILENCE_MS,
  ecrireRejet,
  estSafariIos,
  lireRejet,
  rejeteRecemment,
  type Navigateur,
  type Stockage,
} from "./installation";

const UA_IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const UA_IPAD_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const UA_MAC_SAFARI = UA_IPAD_SAFARI;
const UA_IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1";
const UA_IPHONE_FIREFOX =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15";
const UA_IPHONE_FACEBOOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0]";
// Edge et Opera sur l'iPhone gardent « Version/ » et « Safari/ » dans leur identifiant : seul leur nom les distingue.
const UA_IPHONE_EDGE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/130.0.2849.80 Mobile/15E148 Safari/605.1.15";
const UA_IPHONE_OPERA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 OPT/5.0.0";
const UA_IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0";
const UA_ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

const navigateur = (userAgent: string, platform = "iPhone", maxTouchPoints = 5): Navigateur => ({ userAgent, platform, maxTouchPoints });

describe("estSafariIos", () => {
  it("reconnaît Safari sur iPhone", () => {
    assert.equal(estSafariIos(navigateur(UA_IPHONE_SAFARI)), true);
  });

  it("reconnaît Safari sur iPad, qui se présente comme un Mac mais a un écran tactile", () => {
    assert.equal(estSafariIos(navigateur(UA_IPAD_SAFARI, "MacIntel", 5)), true);
  });

  it("ne prend pas un vrai Mac pour un iPad", () => {
    assert.equal(estSafariIos(navigateur(UA_MAC_SAFARI, "MacIntel", 0)), false);
  });

  it("laisse de côté les autres navigateurs de l'iPhone et les navigateurs intégrés aux applications", () => {
    for (const ua of [UA_IPHONE_CHROME, UA_IPHONE_FIREFOX, UA_IPHONE_EDGE, UA_IPHONE_OPERA, UA_IPHONE_FACEBOOK, UA_IPHONE_INSTAGRAM]) {
      assert.equal(estSafariIos(navigateur(ua)), false, ua);
    }
  });

  it("ne reconnaît ni Android ni un ordinateur", () => {
    assert.equal(estSafariIos(navigateur(UA_ANDROID_CHROME, "Linux armv8l", 5)), false);
    assert.equal(estSafariIos(navigateur("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36", "Win32", 0)), false);
  });
});

describe("choisirMessage", () => {
  const base = { installee: false, rejeteRecemment: false, delaiEcoule: true, invitationPrete: false, safariIos: false };

  it("propose l'installation d'un appui quand Chrome l'a préparée", () => {
    assert.equal(choisirMessage({ ...base, invitationPrete: true }), "android");
  });

  it("explique le geste à faire sur Safari de l'iPhone", () => {
    assert.equal(choisirMessage({ ...base, safariIos: true }), "ios");
  });

  it("ne dit rien quand rien ne permet d'installer", () => {
    assert.equal(choisirMessage(base), "aucun");
  });

  it("attend le délai avant de parler", () => {
    assert.equal(choisirMessage({ ...base, invitationPrete: true, delaiEcoule: false }), "aucun");
    assert.equal(choisirMessage({ ...base, safariIos: true, delaiEcoule: false }), "aucun");
  });

  it("se tait dans l'application installée et après un « Plus tard » récent", () => {
    assert.equal(choisirMessage({ ...base, invitationPrete: true, installee: true }), "aucun");
    assert.equal(choisirMessage({ ...base, safariIos: true, installee: true }), "aucun");
    assert.equal(choisirMessage({ ...base, invitationPrete: true, rejeteRecemment: true }), "aucun");
    assert.equal(choisirMessage({ ...base, safariIos: true, rejeteRecemment: true }), "aucun");
  });

  it("préfère le bouton d'installation aux explications quand les deux sont possibles", () => {
    assert.equal(choisirMessage({ ...base, invitationPrete: true, safariIos: true }), "android");
  });
});

describe("rejeteRecemment", () => {
  const maintenant = 1_800_000_000_000;

  it("est faux sans refus enregistré", () => {
    assert.equal(rejeteRecemment(undefined, maintenant), false);
  });

  it("est vrai pendant 14 jours après un refus, faux ensuite", () => {
    assert.equal(rejeteRecemment(maintenant - 1000, maintenant), true);
    assert.equal(rejeteRecemment(maintenant - 13 * 24 * 3600 * 1000, maintenant), true);
    assert.equal(rejeteRecemment(maintenant - DUREE_SILENCE_MS + 1, maintenant), true);
    assert.equal(rejeteRecemment(maintenant - DUREE_SILENCE_MS, maintenant), false);
    assert.equal(rejeteRecemment(maintenant - 15 * 24 * 3600 * 1000, maintenant), false);
  });

  it("ignore une date dans le futur (horloge changée)", () => {
    assert.equal(rejeteRecemment(maintenant + 1000, maintenant), false);
  });
});

describe("lireRejet et ecrireRejet", () => {
  function stockageEnMemoire(valeurs: Record<string, string> = {}) {
    const donnees = new Map(Object.entries(valeurs));
    const stockage: Stockage = {
      getItem: (cle) => donnees.get(cle) ?? null,
      setItem: (cle, valeur) => void donnees.set(cle, valeur),
    };
    return { stockage, donnees };
  }
  const casse: Stockage = {
    getItem: () => {
      throw new Error("stockage bloqué");
    },
    setItem: () => {
      throw new Error("stockage bloqué");
    },
  };

  it("écrit la date du refus puis la relit", () => {
    const { stockage, donnees } = stockageEnMemoire();
    ecrireRejet(stockage, 1_800_000_000_000);
    assert.equal(donnees.get(CLE_REJET), "1800000000000");
    assert.equal(lireRejet(stockage), 1_800_000_000_000);
  });

  it("ne trouve rien quand rien n'a été écrit, ou quand la valeur n'est pas une date", () => {
    assert.equal(lireRejet(stockageEnMemoire().stockage), undefined);
    for (const valeur of ["abc", "", "-5", "NaN", "Infinity"]) {
      assert.equal(lireRejet(stockageEnMemoire({ [CLE_REJET]: valeur }).stockage), undefined, valeur);
    }
  });

  it("ne plante pas quand le stockage est absent ou bloqué (navigation privée)", () => {
    assert.equal(lireRejet(undefined), undefined);
    assert.equal(lireRejet(casse), undefined);
    assert.doesNotThrow(() => ecrireRejet(undefined, 1));
    assert.doesNotThrow(() => ecrireRejet(casse, 1));
  });
});
