// Tests de l'écran de démarrage : une fois par ouverture, et les images de démarrage de l'iPhone. Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { APPAREILS_IOS, CLE_DEMARRAGE, ID_ECRAN_DEMARRAGE, imagesDeDemarrage, SCRIPT_DEMARRAGE } from "./demarrage";

/** Joue le script comme le navigateur : avec un faux document et une fausse mémoire d'onglet. */
function jouer({ ecran = true, memoire = new Map<string, string>(), memoireBloquee = false } = {}) {
  const attributs = new Map<string, string>();
  const elements = new Map<string, { setAttribute(nom: string, valeur: string): void }>();
  if (ecran) elements.set(ID_ECRAN_DEMARRAGE, { setAttribute: (nom, valeur) => void attributs.set(nom, valeur) });
  const document = { getElementById: (id: string) => elements.get(id) ?? null };
  const sessionStorage = memoireBloquee
    ? {
        getItem: () => {
          throw new Error("bloqué");
        },
        setItem: () => {
          throw new Error("bloqué");
        },
      }
    : { getItem: (cle: string) => memoire.get(cle) ?? null, setItem: (cle: string, valeur: string) => void memoire.set(cle, valeur) };
  new Function("document", "sessionStorage", SCRIPT_DEMARRAGE)(document, sessionStorage);
  return { attributs, memoire };
}

describe("script de l'écran de démarrage", () => {
  it("allume l'écran à la première ouverture et s'en souvient", () => {
    const { attributs, memoire } = jouer();
    assert.equal(attributs.get("data-actif"), "oui");
    assert.equal(memoire.get(CLE_DEMARRAGE), "1");
  });
  it("ne le rallume pas quand l'onglet l'a déjà montré (rechargement, autre page)", () => {
    const { attributs } = jouer({ memoire: new Map([[CLE_DEMARRAGE, "1"]]) });
    assert.equal(attributs.has("data-actif"), false);
  });
  it("le montre quand la mémoire de l'onglet est bloquée (on ne peut pas savoir)", () => {
    const { attributs } = jouer({ memoireBloquee: true });
    assert.equal(attributs.get("data-actif"), "oui");
  });
  it("ne plante pas quand l'écran n'existe pas dans la page", () => {
    const { attributs } = jouer({ ecran: false });
    assert.equal(attributs.size, 0);
  });
  it("ne dépend de rien d'autre que document et sessionStorage", () => {
    assert.doesNotThrow(() => new Function("document", "sessionStorage", SCRIPT_DEMARRAGE));
    assert.ok(!SCRIPT_DEMARRAGE.includes("</script"));
  });
});

describe("images de démarrage de l'iPhone", () => {
  const images = imagesDeDemarrage();

  it("donne une image claire et une image sombre par taille d'iPhone", () => {
    assert.equal(images.length, APPAREILS_IOS.length * 2);
    assert.ok(APPAREILS_IOS.length >= 13);
  });
  it("écrit la requête d'écran que Safari attend, en portrait, avec le mode sombre pour les images sombres", () => {
    const clair = images.find((image) => image.url === "/demarrage/iphone-1179x2556-clair.png");
    const sombre = images.find((image) => image.url === "/demarrage/iphone-1179x2556-sombre.png");
    assert.equal(
      clair?.media,
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)",
    );
    assert.equal(
      sombre?.media,
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)",
    );
  });
  it("nomme chaque image avec ses vrais pixels (largeur × hauteur × ratio)", () => {
    for (const { largeur, hauteur, ratio } of APPAREILS_IOS) {
      assert.ok(images.some((i) => i.url === `/demarrage/iphone-${largeur * ratio}x${hauteur * ratio}-clair.png`));
    }
  });
  it("n'a pas deux fois la même image ni la même requête", () => {
    assert.equal(new Set(images.map((i) => i.url)).size, images.length);
    assert.equal(new Set(images.map((i) => i.media)).size, images.length);
  });
  it("a bien un fichier pour chaque image annoncée", () => {
    for (const { url } of images) {
      const chemin = path.join(process.cwd(), "public", url);
      assert.ok(fs.existsSync(chemin), `fichier manquant : ${url}`);
    }
  });
  it("les fichiers ont les dimensions annoncées par leur nom", () => {
    for (const { url } of images) {
      const [, largeur, hauteur] = url.match(/iphone-(\d+)x(\d+)-/) ?? [];
      const png = fs.readFileSync(path.join(process.cwd(), "public", url));
      assert.equal(png.readUInt32BE(16), Number(largeur), `largeur de ${url}`);
      assert.equal(png.readUInt32BE(20), Number(hauteur), `hauteur de ${url}`);
    }
  });
});
