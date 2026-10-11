// Tests de la mesure de la recherche. Lancer : npm test
// Les fiches ci-dessous sont des données FICTIVES de test : elles ne doivent jamais aller dans content/.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Fiche } from "../fiches/schema";
import { evaluerRecherche, parseQuestions, verifierDonnees, type Question } from "./retrieval";

function fiche(overrides: Partial<Fiche> & Pick<Fiche, "slug" | "titre">): Fiche {
  return {
    categorie: "autre",
    resume: "Résumé de test sans information administrative réelle.",
    mots_cles: ["test", "exemple", "fictif"],
    pieces: [],
    etapes: ["Étape de test"],
    cout: null,
    delai: null,
    lieu: null,
    sources: [{ titre: "Source de test", url: "https://example.org", consulte_le: "2026-10-11" }],
    statut: "verifie",
    verifie_le: "2026-10-11",
    verifie_par: "testeur",
    corps: "",
    ...overrides,
  };
}

function question(overrides: Partial<Question> & Pick<Question, "question">): Question {
  return { famille: "couverte", langue: "fr", attendu_slug: null, doit_contenir: [], ...overrides };
}

const permis = fiche({
  slug: "permis",
  titre: "Permis de conduire",
  mots_cles: ["permis", "conduire", "examen"],
  cout: "5 000 FCFA (donnée fictive de test)",
});
const passeport = fiche({
  slug: "passeport",
  titre: "Passeport biométrique",
  mots_cles: ["passeport", "voyage", "biometrique"],
});

describe("parseQuestions", () => {
  const valide = { question: "Combien coûte le permis ?", famille: "couverte", attendu_slug: "permis" };

  it("lit une question valide et applique les valeurs par défaut", () => {
    const { questions, erreurs } = parseQuestions(JSON.stringify(valide));
    assert.deepEqual(erreurs, []);
    assert.deepEqual(questions, [
      {
        question: "Combien coûte le permis ?",
        famille: "couverte",
        langue: "fr",
        attendu_slug: "permis",
        doit_contenir: [],
      },
    ]);
  });

  it("ignore les lignes vides", () => {
    const { questions, erreurs } = parseQuestions(`\n${JSON.stringify(valide)}\n\n`);
    assert.deepEqual(erreurs, []);
    assert.equal(questions.length, 1);
  });

  it("signale une ligne illisible avec son numéro", () => {
    const { questions, erreurs } = parseQuestions(`${JSON.stringify(valide)}\n{pas du json`);
    assert.equal(questions.length, 1);
    assert.equal(erreurs.length, 1);
    assert.match(erreurs[0], /^ligne 2/);
  });

  it("refuse une famille inconnue", () => {
    const { questions, erreurs } = parseQuestions(JSON.stringify({ ...valide, famille: "autre" }));
    assert.equal(questions.length, 0);
    assert.match(erreurs[0], /famille/);
  });

  it("exige une fiche attendue pour une question couverte", () => {
    const { questions, erreurs } = parseQuestions(JSON.stringify({ question: "Combien coûte le permis ?", famille: "couverte" }));
    assert.equal(questions.length, 0);
    assert.match(erreurs[0], /attendu_slug/);
  });

  it("refuse une fiche attendue pour une question hors périmètre ou vague", () => {
    for (const famille of ["hors_perimetre", "vague"]) {
      const { questions, erreurs } = parseQuestions(JSON.stringify({ ...valide, famille }));
      assert.equal(questions.length, 0, famille);
      assert.match(erreurs[0], /attendu_slug/, famille);
    }
  });

  it("refuse doit_contenir en dehors des questions couvertes", () => {
    const ligne = { question: "Quel temps fait-il ?", famille: "hors_perimetre", doit_contenir: ["soleil"] };
    const { questions, erreurs } = parseQuestions(JSON.stringify(ligne));
    assert.equal(questions.length, 0);
    assert.match(erreurs[0], /doit_contenir/);
  });

  it("refuse un champ inconnu, pour repérer les fautes de frappe", () => {
    const { questions, erreurs } = parseQuestions(JSON.stringify({ ...valide, attendu_slugs: ["permis"] }));
    assert.equal(questions.length, 0);
    assert.equal(erreurs.length, 1);
  });

  it("accepte les langues mixte et wo, et refuse les autres", () => {
    for (const langue of ["mixte", "wo"]) {
      assert.deepEqual(parseQuestions(JSON.stringify({ ...valide, langue })).erreurs, [], langue);
    }
    assert.match(parseQuestions(JSON.stringify({ ...valide, langue: "en" })).erreurs[0], /langue/);
  });
});

describe("verifierDonnees", () => {
  it("signale une fiche attendue inconnue", () => {
    const erreurs = verifierDonnees([question({ question: "Et le visa ?", attendu_slug: "visa" })], [permis]);
    assert.equal(erreurs.length, 1);
    assert.match(erreurs[0], /visa/);
  });

  it("signale un fait attendu qui ne figure pas dans la fiche", () => {
    const q = question({ question: "Combien coûte le permis ?", attendu_slug: "permis", doit_contenir: ["12 000 FCFA"] });
    const erreurs = verifierDonnees([q], [permis]);
    assert.equal(erreurs.length, 1);
    assert.match(erreurs[0], /12 000 FCFA/);
  });

  it("accepte un fait présent, sans tenir compte des accents ni de la casse", () => {
    const q = question({
      question: "Combien coûte le permis ?",
      attendu_slug: "permis",
      doit_contenir: ["5 000 FCFA", "DONNEE FICTIVE"],
    });
    assert.deepEqual(verifierDonnees([q], [permis]), []);
  });

  it("ne contrôle rien pour les questions sans fiche attendue", () => {
    const q = question({ question: "Quel temps fait-il ?", famille: "hors_perimetre" });
    assert.deepEqual(verifierDonnees([q], [permis]), []);
  });
});

describe("evaluerRecherche", () => {
  it("question couverte : la fiche attendue en tête est une réussite de rang 1", () => {
    const q = question({ question: "permis de conduire", attendu_slug: "permis" });
    const { resultats } = evaluerRecherche([q], [passeport, permis], { seuil: 0 });
    assert.equal(resultats[0].statut, "reussie");
    assert.equal(resultats[0].rang, 1);
    assert.equal(resultats[0].trouvees[0].slug, "permis");
  });

  it("question couverte : la fiche attendue en 2e position est une réussite partielle", () => {
    const complete = fiche({ slug: "complete", titre: "Visa de voyage", mots_cles: ["visa", "voyage", "ambassade"] });
    const partielle = fiche({ slug: "partielle", titre: "Démarche de test", mots_cles: ["visa", "test", "exemple"] });
    const q = question({ question: "visa voyage", attendu_slug: "partielle" });
    const { resultats } = evaluerRecherche([q], [partielle, complete], { seuil: 0 });
    assert.equal(resultats[0].statut, "partielle");
    assert.equal(resultats[0].rang, 2);
  });

  it("compte une réussite partielle parmi les 3 premières, mais pas en 1er", () => {
    const complete = fiche({ slug: "complete", titre: "Visa de voyage", mots_cles: ["visa", "voyage", "ambassade"] });
    const partielle = fiche({ slug: "partielle", titre: "Démarche de test", mots_cles: ["visa", "test", "exemple"] });
    const q = question({ question: "visa voyage", attendu_slug: "partielle" });
    const { global } = evaluerRecherche([q], [complete, partielle], { seuil: 0 });
    assert.deepEqual(global.couvertes, { evaluees: 1, top1: 0, top3: 1, ignorees: 0 });
  });

  it("question couverte : la fiche attendue absente des résultats est un échec", () => {
    const q = question({ question: "permis", attendu_slug: "passeport" });
    const { resultats } = evaluerRecherche([q], [passeport, permis], { seuil: 0 });
    assert.equal(resultats[0].statut, "echouee");
    assert.equal(resultats[0].rang, null);
    assert.deepEqual(
      resultats[0].trouvees.map((t) => t.slug),
      ["permis"],
    );
  });

  it("hors périmètre : aucune fiche renvoyée est une réussite, sinon un échec", () => {
    const refus = question({ question: "recette du mafé", famille: "hors_perimetre" });
    const faux = question({ question: "permis", famille: "hors_perimetre" });
    const { resultats } = evaluerRecherche([refus, faux], [permis], { seuil: 0 });
    assert.equal(resultats[0].statut, "reussie");
    assert.equal(resultats[1].statut, "echouee");
    assert.equal(resultats[1].trouvees[0].slug, "permis");
  });

  it("question vague : ignorée, car la question de précision demande l'IA", () => {
    const q = question({ question: "Je veux un papier", famille: "vague" });
    const { resultats } = evaluerRecherche([q], [permis]);
    assert.equal(resultats[0].statut, "ignoree");
    assert.match(resultats[0].raison ?? "", /IA/);
  });

  it("fiche attendue en brouillon : ignorée, puis évaluée avec les brouillons", () => {
    const brouillon = fiche({ slug: "permis", titre: "Permis de conduire", statut: "brouillon", verifie_le: null, verifie_par: null, mots_cles: ["permis", "conduire", "examen"] });
    const q = question({ question: "permis de conduire", attendu_slug: "permis" });
    const sans = evaluerRecherche([q], [brouillon], { seuil: 0 }).resultats[0];
    assert.equal(sans.statut, "ignoree");
    assert.match(sans.raison ?? "", /brouillon/);
    const avec = evaluerRecherche([q], [brouillon], { seuil: 0, inclureBrouillons: true }).resultats[0];
    assert.equal(avec.statut, "reussie");
  });

  it("fiche attendue inconnue : ignorée avec la raison", () => {
    const q = question({ question: "visa voyage", attendu_slug: "visa" });
    const { resultats } = evaluerRecherche([q], [permis], { seuil: 0 });
    assert.equal(resultats[0].statut, "ignoree");
    assert.match(resultats[0].raison ?? "", /inconnue/);
  });

  it("utilise le seuil donné : une question juste en dessous n'est plus trouvée", () => {
    const q = question({ question: "permis de conduire", attendu_slug: "permis" });
    assert.equal(evaluerRecherche([q], [permis], { seuil: 0 }).resultats[0].statut, "reussie");
    assert.equal(evaluerRecherche([q], [permis], { seuil: 1000 }).resultats[0].statut, "echouee");
  });

  it("résume les résultats, au total et par langue", () => {
    const questions = [
      question({ question: "permis de conduire", attendu_slug: "permis" }),
      question({ question: "passeport", attendu_slug: "permis", langue: "mixte" }),
      question({ question: "recette du mafé", famille: "hors_perimetre" }),
      question({ question: "Dama bëgg kayit", famille: "vague", langue: "wo" }),
    ];
    const { global, parLangue } = evaluerRecherche(questions, [passeport, permis], { seuil: 0 });
    assert.deepEqual(global, {
      couvertes: { evaluees: 2, top1: 1, top3: 1, ignorees: 0 },
      refus: { evaluees: 1, corrects: 1 },
      vagues: { ignorees: 1 },
    });
    assert.deepEqual(parLangue.fr?.couvertes, { evaluees: 1, top1: 1, top3: 1, ignorees: 0 });
    assert.deepEqual(parLangue.mixte?.couvertes, { evaluees: 1, top1: 0, top3: 0, ignorees: 0 });
    assert.deepEqual(parLangue.wo?.vagues, { ignorees: 1 });
  });
});
