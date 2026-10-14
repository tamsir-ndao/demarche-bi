// Tests du contrôleur de fidélité. Aucune requête réseau : les fiches sont des données FICTIVES de test.
// Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ficheDeTest } from "../ai/fiche-de-test";
import { extraireNombres } from "../ai/guardrails";
import { loadFiches } from "../fiches/load";
import { controlerFidelite, ditNePasSavoir, extraireElements, texteDeReference, type Element } from "./fidelite";

const fiche = ficheDeTest({
  slug: "carte",
  titre: "Carte de test",
  resume: "Une carte de test pour les essais, sans valeur réelle.",
  pieces: ["Une photo d'identité récente", "Un justificatif de domicile"],
  etapes: ["Dépose le dossier au Commissariat de Dakar", "Passe à la caisse"],
  cout: "Timbre de 10 000 FCFA",
  delai: "2 jours",
  lieu: "Commissariat de Dakar",
  corps: "Texte libre de la fiche. La carte est valable 5 ans.",
  sources: [{ titre: "Guichet officiel de test", url: "https://example.org", consulte_le: "2026-10-11" }],
});

const absents = (texte: string, f = fiche, options?: { tolerer?: string[]; question?: string }): Element[] =>
  controlerFidelite(texte, f, options).absents;

describe("texteDeReference", () => {
  it("réunit tout ce que la fiche dit, titres des sources compris", () => {
    const texte = texteDeReference(fiche);
    for (const morceau of [
      "Carte de test",
      "sans valeur réelle",
      "photo d'identité",
      "Commissariat de Dakar",
      "Timbre de 10 000 FCFA",
      "2 jours",
      "Texte libre",
      "Guichet officiel de test",
    ]) {
      assert.ok(texte.includes(morceau), morceau);
    }
  });

  it("n'écrit pas « null » pour un champ vide", () => {
    const vide = ficheDeTest({ slug: "vide", titre: "Fiche sans champs" });
    assert.ok(!texteDeReference(vide).includes("null"));
  });
});

describe("extraireElements", () => {
  it("reconnaît un montant, une durée, un nombre et un nom propre", () => {
    assert.deepEqual(extraireElements("Compte 10 000 FCFA, 2 jours et 3 photos à Dakar."), [
      { type: "montant", texte: "10 000 FCFA" },
      { type: "duree", texte: "2 jours" },
      { type: "nombre", texte: "3" },
      { type: "nom_propre", texte: "Dakar" },
    ]);
  });

  it("ne compte pas un mot en majuscule au début d'une phrase", () => {
    assert.deepEqual(extraireElements("Bonjour. Voici la carte ! Tu la retires à Thiès."), [{ type: "nom_propre", texte: "Thiès" }]);
    assert.deepEqual(extraireElements("« Dakar » est la seule ville."), []);
  });

  it("garde un mot capitalisé au milieu d'une phrase, sigles compris, mais pas une lettre seule", () => {
    assert.deepEqual(extraireElements("Va au Commissariat avec ta CNI, catégorie B."), [
      { type: "nom_propre", texte: "Commissariat" },
      { type: "nom_propre", texte: "CNI" },
    ]);
  });

  it("ne prend pas un code collé à un chiffre (SG2, C1) pour un nom propre", () => {
    assert.deepEqual(extraireElements("Les types 508 et SG2, catégorie C1."), [
      { type: "nombre", texte: "508" },
      { type: "nombre", texte: "2" },
      { type: "nombre", texte: "1" },
    ]);
  });

  it("lit « Saint-Louis » comme un seul nom propre", () => {
    assert.deepEqual(extraireElements("Rends-toi à Saint-Louis."), [{ type: "nom_propre", texte: "Saint-Louis" }]);
  });

  it("n'écrit chaque élément qu'une fois", () => {
    assert.equal(extraireElements("2 jours, puis encore 2 jours, soit deux jours").length, 1);
  });

  it("ne prend pas FCFA ni « francs CFA » pour des noms propres", () => {
    assert.deepEqual(extraireElements("Il faut 5 000 francs CFA, puis 6 000 FCFA."), [
      { type: "montant", texte: "5 000 francs CFA" },
      { type: "montant", texte: "6 000 FCFA" },
    ]);
  });

  it("étend une plage aux deux bouts : « 2 à 3 jours », « de 75 à 150 FCFA »", () => {
    assert.deepEqual(extraireElements("Compte 2 à 3 jours."), [
      { type: "duree", texte: "2 jours" },
      { type: "duree", texte: "3 jours" },
    ]);
    assert.deepEqual(extraireElements("De 75 à 150 FCFA."), [
      { type: "montant", texte: "75 FCFA" },
      { type: "montant", texte: "150 FCFA" },
    ]);
  });

  it("ne partage pas l'unité entre deux nombres que d'autres mots séparent", () => {
    assert.deepEqual(extraireElements("Apporte 2 photos et 3 jours de patience."), [
      { type: "nombre", texte: "2" },
      { type: "duree", texte: "3 jours" },
    ]);
  });

  it("lit les nombres écrits en lettres", () => {
    assert.deepEqual(extraireElements("Cinq jours, dix mille francs, vingt et un ans, deux photos."), [
      { type: "duree", texte: "Cinq jours" },
      { type: "montant", texte: "dix mille francs" },
      { type: "duree", texte: "vingt et un ans" },
      { type: "nombre", texte: "deux" },
    ]);
  });

  it("ne prend pas « neuf » (véhicule neuf) ni « un » (article) pour des nombres", () => {
    assert.deepEqual(extraireElements("Pour un véhicule neuf, prends un dossier."), []);
  });

  it("lit « un jour » et « une semaine » comme des durées", () => {
    assert.deepEqual(extraireElements("Compte un jour, parfois une semaine."), [
      { type: "duree", texte: "un jour" },
      { type: "duree", texte: "une semaine" },
    ]);
  });

  it("donne les mêmes nombres que extraireNombres des garde-fous", () => {
    for (const texte of ["800 00 2012", "10.000 et 10 000 et 10000", "2,5 puis 1 500,5", "loi 72-61 du 12/10/2026", "C1 et A1, n° 3"]) {
      const attendus = extraireNombres(texte);
      // Chaque nombre de extraireNombres, écrit seul dans une fiche, y est retrouvé : même valeur, même écriture.
      const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", corps: attendus.join(" ; ") });
      assert.deepEqual(absents(texte, f), [], texte);
      // Et inversement : les nombres lus par le contrôleur sont tous dans extraireNombres.
      const g = ficheDeTest({ slug: "y", titre: "Fiche de contrôle", corps: texte });
      assert.deepEqual(absents(attendus.join(" ; "), g), [], texte);
    }
  });
});

describe("controlerFidelite : nombres", () => {
  it("accepte un nombre de la fiche, même écrit autrement", () => {
    assert.equal(controlerFidelite("La carte est valable 5 ans.", fiche).fidele, true);
    assert.equal(controlerFidelite("Il y a 2 étapes ici : 2 jours.", fiche).fidele, true);
  });

  it("signale un nombre absent de la fiche", () => {
    assert.deepEqual(absents("Prends 3 photos."), [{ type: "nombre", texte: "3" }]);
  });

  it("n'accepte jamais un nombre parce que la question le contient", () => {
    assert.deepEqual(absents("Prends 3 photos.", fiche, { question: "Je veux 3 photos" }), [{ type: "nombre", texte: "3" }]);
  });

  it("lit un nombre en lettres comme le même nombre en chiffres", () => {
    assert.equal(controlerFidelite("La carte est valable cinq ans.", fiche).fidele, true);
    assert.deepEqual(absents("La carte est valable six ans."), [{ type: "duree", texte: "six ans" }]);
    assert.deepEqual(absents("Il faut sept pièces."), [{ type: "nombre", texte: "sept" }]);
  });

  it("calcule les nombres composés en lettres", () => {
    const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", corps: "Frais : 1 500 FCFA, 80 FCFA, 21 jours, 280 FCFA, 2 500 000 FCFA." });
    assert.deepEqual(absents("Mille cinq cents francs, quatre-vingts francs, vingt et un jours, deux cent quatre-vingt francs, deux millions cinq cent mille francs.", f), []);
    assert.equal(absents("Quatre-vingt-dix francs.", f).length, 1);
  });
});

describe("controlerFidelite : montants", () => {
  it("accepte 10 000, 10.000 et 10000 FCFA, ou en francs", () => {
    for (const ecriture of ["10 000 FCFA", "10.000 FCFA", "10000 FCFA", "10 000 francs", "10.000 F CFA", "10 000 CFA", "dix mille francs"]) {
      assert.deepEqual(absents(`Compte ${ecriture}.`), [], ecriture);
    }
  });

  it("signale un montant différent", () => {
    assert.deepEqual(absents("Compte 15 000 FCFA."), [{ type: "montant", texte: "15 000 FCFA" }]);
    assert.deepEqual(absents("Compte 1 000 FCFA."), [{ type: "montant", texte: "1 000 FCFA" }]);
  });

  it("exige l'unité d'argent : un nombre de la fiche ne vaut pas montant", () => {
    // « 5 ans » est dans la fiche, pas « 5 FCFA ».
    assert.deepEqual(absents("Compte 5 FCFA."), [{ type: "montant", texte: "5 FCFA" }]);
  });

  it("accepte un montant de la plage d'une fiche", () => {
    const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", cout: "De 200 FCFA à 500 FCFA selon la commune ; de 75 à 150 FCFA ailleurs" });
    assert.deepEqual(absents("Entre 75 FCFA et 150 FCFA, ou 500 francs.", f), []);
    assert.equal(absents("Compte 300 FCFA.", f).length, 1);
  });
});

describe("controlerFidelite : durées", () => {
  it("accepte la durée de la fiche, au singulier comme au pluriel", () => {
    assert.deepEqual(absents("C'est prêt en 2 jours."), []);
    assert.deepEqual(absents("C'est prêt en deux jours."), []);
    const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", delai: "1 jour ; ou 2 semaines" });
    assert.deepEqual(absents("Compte 1 jour, ou un jour, ou 2 semaines, ou 2 semaine.", f), []);
  });

  it("ne convertit pas une unité : 48 heures n'est pas 2 jours", () => {
    assert.deepEqual(absents("C'est prêt en 48 heures."), [{ type: "duree", texte: "48 heures" }]);
    assert.deepEqual(absents("C'est prêt en 2 semaines."), [{ type: "duree", texte: "2 semaines" }]);
    assert.deepEqual(absents("Compte 2 mois."), [{ type: "duree", texte: "2 mois" }]);
  });

  it("garde la même unité mais pas un autre nombre", () => {
    assert.deepEqual(absents("C'est prêt en 3 jours."), [{ type: "duree", texte: "3 jours" }]);
  });

  it("lit une plage de la fiche : « de 15 à 30 jours »", () => {
    const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", delai: "De 15 à 30 jours" });
    assert.deepEqual(absents("Compte 15 jours, au plus 30 jours.", f), []);
    assert.deepEqual(absents("Compte 20 jours.", f), [{ type: "duree", texte: "20 jours" }]);
  });

  it("lit les durées abrégées", () => {
    const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", delai: "48 h" });
    assert.deepEqual(absents("C'est prêt en 48 heures.", f), []);
  });
});

describe("controlerFidelite : noms propres", () => {
  it("accepte un nom de la fiche, sans tenir compte des accents ni de la casse", () => {
    assert.deepEqual(absents("Va au Commissariat de Dakar."), []);
    const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", lieu: "Centre de Thies" });
    assert.deepEqual(absents("Va au Centre de Thiès.", f), []);
  });

  it("signale un nom propre absent de la fiche", () => {
    assert.deepEqual(absents("Va à la Préfecture de Dakar."), [{ type: "nom_propre", texte: "Préfecture" }]);
  });

  it("tolère les mots de la question, sans accent ni casse", () => {
    assert.deepEqual(absents("Va à la mairie de Thiès.", fiche, { question: "Où aller à thies ?" }), []);
    assert.equal(absents("Va à la mairie de Thiès.").length, 1);
  });

  it("tolère le pays, le nom du site et FCFA sans nombre", () => {
    assert.deepEqual(absents("Au Sénégal, Démarche-Bi donne les montants en FCFA."), []);
  });

  it("accepte ce que l'appelant tolère", () => {
    assert.deepEqual(absents("Va à la Préfecture de Dakar.", fiche, { tolerer: ["Préfecture"] }), []);
    assert.deepEqual(absents("Va à Saint-Louis.", fiche, { tolerer: ["saint-louis"] }), []);
  });

  it("vérifie un sigle de la même façon", () => {
    assert.deepEqual(absents("Passe par la DFEPC."), [{ type: "nom_propre", texte: "DFEPC" }]);
    const f = ficheDeTest({ slug: "x", titre: "Fiche de contrôle", lieu: "Au niveau de la DFEPC" });
    assert.deepEqual(absents("Passe par la DFEPC.", f), []);
  });
});

describe("controlerFidelite : sortie", () => {
  it("dit fidèle quand rien ne manque, et rend tous les éléments lus", () => {
    const controle = controlerFidelite("Compte 10 000 FCFA et 2 jours au Commissariat de Dakar.", fiche);
    assert.equal(controle.fidele, true);
    assert.deepEqual(controle.absents, []);
    assert.deepEqual(
      controle.elements.map((element) => element.type),
      ["montant", "duree", "nom_propre", "nom_propre"],
    );
  });

  it("dit non fidèle avec la liste de ce qui manque", () => {
    const controle = controlerFidelite("Compte 12 000 FCFA, 4 jours, à Kaolack.", fiche);
    assert.equal(controle.fidele, false);
    assert.deepEqual(
      controle.absents.map((element) => element.texte),
      ["12 000 FCFA", "4 jours", "Kaolack"],
    );
  });

  it("lit un texte sans aucun élément comme fidèle", () => {
    assert.deepEqual(controlerFidelite("Voici ce qu'il faut savoir pour ta carte.", fiche), { elements: [], absents: [], fidele: true });
  });
});

describe("ditNePasSavoir", () => {
  it("reconnaît les façons de dire « je ne sais pas »", () => {
    for (const phrase of [
      "Le coût n'est pas précisé dans la fiche.",
      "Délai non indiqué.",
      "Je ne sais pas combien ça coûte.",
      "La fiche ne mentionne pas le lieu.",
      "Le montant n’est pas indiqué.",
      "Aucune information sur le délai.",
      "Pas d'information sur les pièces.",
      "Le lieu est à confirmer auprès de l'administration.",
      "On ne sait pas encore.",
      "Le délai est inconnu.",
      "LE DÉLAI N'EST PAS PRÉCISÉ",
    ]) {
      assert.equal(ditNePasSavoir(phrase), true, phrase);
    }
  });

  it("ne confond pas avec une réponse qui donne une valeur", () => {
    for (const phrase of ["Le timbre coûte 10 000 FCFA.", "C'est prêt en 2 jours.", "Rends-toi au commissariat.", ""]) {
      assert.equal(ditNePasSavoir(phrase), false, phrase);
    }
  });
});

describe("controlerFidelite sur les vraies fiches", () => {
  const { fiches } = loadFiches();

  it("trouve fidèle chaque morceau d'une fiche face à elle-même (aucun faux positif)", () => {
    assert.ok(fiches.length > 0);
    for (const f of fiches) {
      const morceaux = [f.titre, f.resume, f.cout ?? "", f.delai ?? "", f.lieu ?? "", ...f.pieces, ...f.etapes, f.corps];
      for (const morceau of morceaux) {
        assert.deepEqual(absents(morceau, f), [], `${f.slug} : ${morceau.slice(0, 60)}`);
      }
    }
  });

  it("signale le coût et le lieu d'une autre fiche, quand ils diffèrent", () => {
    const passeport = fiches.find((f) => f.slug === "passeport-ordinaire");
    const international = fiches.find((f) => f.slug === "permis-de-conduire-international");
    assert.ok(passeport?.cout && international?.cout && international.lieu, "fiches de référence introuvables");
    const controle = controlerFidelite(`${international.cout} ${international.lieu}`, passeport);
    assert.equal(controle.fidele, false);
    assert.ok(controle.absents.some((element) => element.type === "montant"));
  });
});
