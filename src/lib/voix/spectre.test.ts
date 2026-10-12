// Tests du calcul du spectre vocal en direct, de la détection de voix et du chronomètre. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  creerDetecteurDeVoix,
  formaterDuree,
  hauteursDuSpectre,
  lisser,
  NOMBRE_DE_BARRES,
  niveauDeVoix,
} from "./spectre";

// Un analyseur réglé comme dans le navigateur : 2048 échantillons à 48 kHz, soit 1024 cases de 23,4 Hz.
const ECHANTILLONNAGE = 48_000;
const TAILLE_FFT = 2048;
const LARGEUR_CASE = ECHANTILLONNAGE / TAILLE_FFT;
const options = { echantillonnage: ECHANTILLONNAGE, tailleFft: TAILLE_FFT };

/** Un spectre vide, avec de l'énergie (de 0 à 255) autour d'une fréquence. */
function spectreAvec(frequenceHz: number, valeur = 255) {
  const cases = new Uint8Array(TAILLE_FFT / 2);
  const centre = Math.round(frequenceHz / LARGEUR_CASE);
  for (let i = centre - 1; i <= centre + 1; i++) cases[i] = valeur;
  return cases;
}

describe("hauteursDuSpectre", () => {
  it("rend une hauteur entre 0 et 1 pour chacune des barres", () => {
    const hauteurs = hauteursDuSpectre(spectreAvec(500), options);
    assert.equal(hauteurs.length, NOMBRE_DE_BARRES);
    for (const h of hauteurs) assert.ok(h >= 0 && h <= 1, String(h));
  });

  it("reste à plat quand il n'y a aucun son", () => {
    assert.deepEqual(hauteursDuSpectre(new Uint8Array(TAILLE_FFT / 2), options), new Array(NOMBRE_DE_BARRES).fill(0));
  });

  it("est symétrique : les graves au centre, les aigus sur les bords", () => {
    const hauteurs = hauteursDuSpectre(spectreAvec(300), options);
    for (let i = 0; i < NOMBRE_DE_BARRES; i++) assert.equal(hauteurs[i], hauteurs[NOMBRE_DE_BARRES - 1 - i]);
  });

  it("lève le centre pour une voix grave et les bords pour un son aigu", () => {
    const centre = Math.floor(NOMBRE_DE_BARRES / 2);
    const grave = hauteursDuSpectre(spectreAvec(120), options);
    const aigu = hauteursDuSpectre(spectreAvec(3500), options);

    assert.ok(grave[centre] > 0.5, `centre grave ${grave[centre]}`);
    assert.equal(grave[0], 0);
    assert.equal(aigu[centre], 0);
    assert.ok(aigu[0] > 0.5, `bord aigu ${aigu[0]}`);
  });

  it("monte avec l'énergie : un son plus fort ne fait jamais baisser une barre", () => {
    const faible = hauteursDuSpectre(spectreAvec(500, 120), options);
    const fort = hauteursDuSpectre(spectreAvec(500, 220), options);
    fort.forEach((h, i) => assert.ok(h >= faible[i], `barre ${i}`));
    assert.ok(Math.max(...fort) > Math.max(...faible));
  });

  it("ignore le bruit de fond faible et les sons hors de la voix", () => {
    assert.deepEqual(hauteursDuSpectre(new Uint8Array(TAILLE_FFT / 2).fill(30), options), new Array(NOMBRE_DE_BARRES).fill(0));
    assert.deepEqual(hauteursDuSpectre(spectreAvec(12_000), options), new Array(NOMBRE_DE_BARRES).fill(0));
    assert.deepEqual(hauteursDuSpectre(spectreAvec(40), options), new Array(NOMBRE_DE_BARRES).fill(0));
  });
});

describe("lisser", () => {
  it("monte vite et redescend doucement", () => {
    assert.deepEqual(lisser([0, 1], [1, 0], { montee: 0.5, descente: 0.1 }), [0.5, 0.9]);
  });

  it("garde le même nombre de barres et ne dépasse jamais l'intervalle", () => {
    const lisse = lisser(new Array(NOMBRE_DE_BARRES).fill(0.3), new Array(NOMBRE_DE_BARRES).fill(1));
    assert.equal(lisse.length, NOMBRE_DE_BARRES);
    for (const h of lisse) assert.ok(h > 0.3 && h <= 1);
  });
});

describe("niveauDeVoix", () => {
  it("vaut 0 pour du silence (le milieu de l'échelle, 128)", () => {
    assert.equal(niveauDeVoix(new Uint8Array(1024).fill(128)), 0);
  });

  it("vaut environ 1 pour un son à pleine puissance et croît avec l'amplitude", () => {
    const carre = (amplitude: number) => Uint8Array.from({ length: 1024 }, (_, i) => 128 + (i % 2 === 0 ? amplitude : -amplitude));
    assert.ok(niveauDeVoix(carre(127)) > 0.99);
    assert.ok(niveauDeVoix(carre(64)) > niveauDeVoix(carre(16)));
    assert.ok(Math.abs(niveauDeVoix(carre(64)) - 0.5) < 0.01);
  });

  it("ne plante pas sans données", () => {
    assert.equal(niveauDeVoix(new Uint8Array(0)), 0);
  });
});

describe("creerDetecteurDeVoix", () => {
  const options = { seuil: 0.02, dureeMinMs: 300 };

  /** Joue `niveaux` (un par image, toutes les 16 ms) et dit si la voix a été entendue. */
  function jouer(niveaux: number[], pasMs = 16) {
    const detecteur = creerDetecteurDeVoix(options);
    niveaux.forEach((niveau, i) => detecteur.suivre(niveau, i * pasMs));
    return detecteur.voixEntendue();
  }

  it("n'entend rien dans le silence ni dans un bruit de fond faible", () => {
    assert.equal(jouer(new Array(200).fill(0)), false);
    assert.equal(jouer(new Array(200).fill(0.01)), false);
  });

  it("entend une voix qui dure assez longtemps", () => {
    assert.equal(jouer([...new Array(10).fill(0), ...new Array(30).fill(0.1)]), true);
  });

  it("n'entend pas une voix trop brève (un claquement, un souffle)", () => {
    assert.equal(jouer([...new Array(50).fill(0), ...new Array(5).fill(0.5), ...new Array(50).fill(0)]), false);
  });

  it("additionne les moments de voix séparés par des silences", () => {
    const parole = [...new Array(12).fill(0.1), ...new Array(30).fill(0), ...new Array(12).fill(0.1)];
    assert.equal(jouer(parole), true);
  });

  it("ne compte pas comme voix un long trou entre deux images (onglet en arrière-plan)", () => {
    const detecteur = creerDetecteurDeVoix(options);
    detecteur.suivre(0.1, 0);
    detecteur.suivre(0.1, 10_000);
    assert.equal(detecteur.voixEntendue(), false);
  });
});

describe("formaterDuree", () => {
  it("écrit minutes et secondes comme un chronomètre", () => {
    assert.equal(formaterDuree(0), "0:00");
    assert.equal(formaterDuree(7_400), "0:07");
    assert.equal(formaterDuree(59_999), "0:59");
    assert.equal(formaterDuree(65_000), "1:05");
  });

  it("ne descend jamais sous zéro", () => {
    assert.equal(formaterDuree(-500), "0:00");
  });
});
