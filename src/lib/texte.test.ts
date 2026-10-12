// Tests des petits outils de texte. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collerLaPonctuation,
  LONGUEUR_MAX_QUESTION,
  motsDeFiltre,
  nettoyerQuestion,
  nettoyerSlug,
  simplifier,
  typographie,
  urlReponse,
} from "./texte";

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

describe("collerLaPonctuation", () => {
  it("remplace l'espace avant « ? », « ! », « : » et « ; » par une espace insécable : le signe ne passe pas seul à la ligne", () => {
    assert.equal(collerLaPonctuation("Comment faire un passeport ?"), "Comment faire un passeport\u00a0?");
    assert.equal(collerLaPonctuation("Attention ! Voilà : oui ; non"), "Attention\u00a0! Voilà\u00a0: oui\u00a0; non");
  });

  it("ne touche pas aux espaces ordinaires ni à un signe collé au mot", () => {
    assert.equal(collerLaPonctuation("Je veux faire ma carte ici"), "Je veux faire ma carte ici");
    assert.equal(collerLaPonctuation("Passeport?"), "Passeport?");
  });

  it("se relit avec nettoyerQuestion : l'espace insécable redevient une espace", () => {
    assert.equal(nettoyerQuestion(collerLaPonctuation("Comment faire un passeport ?")), "Comment faire un passeport ?");
  });
});

describe("urlReponse", () => {
  it("met la question dans l'adresse, avec ses espaces et ses accents encodés", () => {
    assert.equal(urlReponse("Carte d'identité ?"), "/reponse?q=Carte+d%27identit%C3%A9+%3F");
  });

  it("ajoute la démarche choisie", () => {
    assert.equal(urlReponse("Carte", "duplicata-carte"), "/reponse?q=Carte&fiche=duplicata-carte");
  });

  it("se relit avec nettoyerQuestion", () => {
    const adresse = new URL(urlReponse("Ma question   avec des espaces ?", "ninea"), "https://exemple.test");
    assert.equal(nettoyerQuestion(adresse.searchParams.get("q") ?? undefined), "Ma question avec des espaces ?");
    assert.equal(nettoyerSlug(adresse.searchParams.get("fiche") ?? undefined), "ninea");
  });
});

describe("nettoyerSlug", () => {
  it("garde une démarche bien écrite", () => {
    assert.equal(nettoyerSlug("duplicata-carte-nationale-identite"), "duplicata-carte-nationale-identite");
    assert.equal(nettoyerSlug("ninea"), "ninea");
  });

  it("prend la première valeur quand le paramètre est répété", () => {
    assert.equal(nettoyerSlug(["ninea", "autre"]), "ninea");
  });

  it("ignore une valeur absente, vide ou mal écrite", () => {
    for (const valeur of [undefined, "", "Ninea", "a b", "../secret", "ninea-", "-ninea", "a--b", "é", "x".repeat(101)]) {
      assert.equal(nettoyerSlug(valeur), undefined, `« ${valeur} » devrait être ignorée`);
    }
  });
});
