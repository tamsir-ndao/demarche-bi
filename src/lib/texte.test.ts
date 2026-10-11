// Tests des petits outils de texte. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LONGUEUR_MAX_QUESTION, motsDeFiltre, nettoyerQuestion, simplifier, typographie } from "./texte";

describe("simplifier", () => {
  it("passe en minuscules et retire les accents", () => {
    assert.equal(simplifier("Éléphant À Dakar"), "elephant a dakar");
  });

  it("garde les chiffres et les espaces", () => {
    assert.equal(simplifier("Bulletin n° 3"), "bulletin n° 3");
  });

  it("rapproche « mœurs » de « moeurs »", () => {
    assert.equal(simplifier("bonne vie et mœurs"), simplifier("bonne vie et moeurs"));
  });
});

describe("nettoyerQuestion", () => {
  it("renvoie un texte vide quand il n'y a pas de question", () => {
    assert.equal(nettoyerQuestion(undefined), "");
  });

  it("prend la première valeur quand l'adresse en contient plusieurs", () => {
    assert.equal(nettoyerQuestion(["première", "seconde"]), "première");
  });

  it("retire les espaces en trop et les retours à la ligne", () => {
    assert.equal(nettoyerQuestion("  J’ai   perdu\nma carte  "), "J’ai perdu ma carte");
  });

  it("garde au plus 300 caractères", () => {
    assert.equal(LONGUEUR_MAX_QUESTION, 300);
    assert.equal(nettoyerQuestion("a".repeat(400)).length, 300);
  });

  it("ne coupe pas un emoji en deux", () => {
    const coupee = nettoyerQuestion("😀".repeat(301));
    assert.equal(Array.from(coupee).length, 300);
    assert.equal(coupee, "😀".repeat(300));
  });

  it("retire l'espace qui se retrouve en fin de texte après la coupe", () => {
    assert.equal(nettoyerQuestion(`${"a".repeat(299)} bbb`), "a".repeat(299));
  });
});

describe("motsDeFiltre", () => {
  it("découpe en mots sans accents ni majuscules", () => {
    assert.deepEqual(motsDeFiltre("Carte d’identité"), ["carte", "identite"]);
  });

  it("met les mots au singulier pour que « cartes » trouve « carte »", () => {
    assert.deepEqual(motsDeFiltre("  Cartes  "), ["carte"]);
  });

  it("laisse intacts les mots courts qui finissent par s", () => {
    assert.deepEqual(motsDeFiltre("bus"), ["bus"]);
  });

  it("rapproche « mœurs » de « moeurs »", () => {
    assert.deepEqual(motsDeFiltre("bonne vie et mœurs"), ["bonne", "vie", "et", "moeur"]);
  });

  it("ignore les lettres isolées et renvoie une liste vide pour un champ vide", () => {
    assert.deepEqual(motsDeFiltre("d l"), []);
    assert.deepEqual(motsDeFiltre(""), []);
  });
});

describe("typographie", () => {
  it("remplace l'apostrophe droite entre deux lettres par l'apostrophe typographique", () => {
    assert.equal(typographie("Duplicata de la carte nationale d'identité"), "Duplicata de la carte nationale d’identité");
  });

  it("traite aussi l'apostrophe devant un chiffre", () => {
    assert.equal(typographie("moins d'1 an"), "moins d’1 an");
  });

  it("remplace toutes les apostrophes du texte", () => {
    assert.equal(typographie("l'extrait ou l'acte"), "l’extrait ou l’acte");
  });

  it("ne touche pas aux apostrophes qui servent de guillemets", () => {
    assert.equal(typographie("'texte' entre quotes"), "'texte' entre quotes");
  });

  it("laisse intact un texte sans apostrophe", () => {
    assert.equal(typographie("Un jour"), "Un jour");
  });
});
