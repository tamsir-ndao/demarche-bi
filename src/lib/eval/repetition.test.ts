// Tests du résumé des répétitions (même question posée plusieurs fois). Aucune requête réseau.
// Les fiches sont des données FICTIVES de test. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Reponse } from "../ai/ask";
import { ficheDeTest } from "../ai/fiche-de-test";
import { resumerRepetitions } from "./repetition";

const carte = ficheDeTest({ slug: "carte", titre: "Carte de test" });
const duplicata = ficheDeTest({ slug: "duplicata", titre: "Duplicata de test" });
const passeport = ficheDeTest({ slug: "passeport", titre: "Passeport de test" });

function fiche(f = carte, surcharge: Partial<Extract<Reponse, { type: "fiche" }>> = {}): Reponse {
  return { type: "fiche", fiche: f, autres: [], intro: "Une phrase.", degrade: null, rejet: null, ...surcharge };
}
const precision = (...options: (typeof carte)[]): Reponse => ({ type: "precision", options, question: "Lequel ?" });
const precisionGenerale: Reponse = { type: "precision_generale", question: "De quoi s'agit-il ?" };
const inconnue: Reponse = { type: "inconnue" };
const horsDomaine: Reponse = { type: "hors_domaine" };

describe("resumerRepetitions", () => {
  it("juge stable une question qui montre toujours la même fiche", () => {
    const [resume] = resumerRepetitions([{ question: "Combien coûte la carte ?", reponses: [fiche(), fiche(), fiche()] }]);

    assert.deepEqual(resume, {
      question: "Combien coûte la carte ?",
      stable: true,
      types: { fiche: 3 },
      slugs: ["carte"],
    });
  });

  it("ne tient pas compte du texte de l'introduction, de l'absence d'introduction ni des fiches « voir aussi »", () => {
    const [resume] = resumerRepetitions([
      {
        question: "q",
        reponses: [
          fiche(carte, { intro: "Première phrase." }),
          fiche(carte, { intro: "Autre phrase." }),
          fiche(carte, { intro: null, degrade: "saturee" }),
          fiche(carte, { intro: null, rejet: "Nombre « 5 » absent de la fiche." }),
          fiche(carte, { autres: [duplicata] }),
        ],
      },
    ]);

    assert.equal(resume.stable, true);
    assert.deepEqual(resume.types, { fiche: 5 });
    assert.deepEqual(resume.slugs, ["carte"]);
  });

  it("signale une question qui change de fiche, et les liste toutes", () => {
    const [resume] = resumerRepetitions([{ question: "q", reponses: [fiche(carte), fiche(duplicata), fiche(carte)] }]);

    assert.equal(resume.stable, false);
    assert.deepEqual(resume.types, { fiche: 3 });
    assert.deepEqual(resume.slugs, ["carte", "duplicata"]);
  });

  it("signale une question qui change de type de réponse", () => {
    const [resume] = resumerRepetitions([{ question: "q", reponses: [fiche(), inconnue, fiche(), horsDomaine] }]);

    assert.equal(resume.stable, false);
    assert.deepEqual(resume.types, { fiche: 2, inconnue: 1, hors_domaine: 1 });
    assert.deepEqual(resume.slugs, ["carte"]);
  });

  it("garde l'ordre d'apparition des types", () => {
    const [resume] = resumerRepetitions([{ question: "q", reponses: [inconnue, fiche(), inconnue] }]);
    assert.deepEqual(Object.keys(resume.types), ["inconnue", "fiche"]);
  });

  it("juge stable un écran de précision qui propose les mêmes démarches dans un autre ordre", () => {
    const [resume] = resumerRepetitions([
      { question: "q", reponses: [precision(carte, duplicata), precision(duplicata, carte)] },
    ]);

    assert.equal(resume.stable, true);
    assert.deepEqual(resume.types, { precision: 2 });
    assert.deepEqual(resume.slugs, ["carte", "duplicata"]);
  });

  it("signale un écran de précision qui change de démarches", () => {
    const [resume] = resumerRepetitions([
      { question: "q", reponses: [precision(carte, duplicata), precision(carte, passeport)] },
    ]);

    assert.equal(resume.stable, false);
    assert.deepEqual(resume.slugs, ["carte", "duplicata", "passeport"]);
  });

  it("distingue une fiche d'un écran de précision qui propose la même démarche", () => {
    const [resume] = resumerRepetitions([{ question: "q", reponses: [fiche(carte), precision(carte, duplicata)] }]);

    assert.equal(resume.stable, false);
    assert.deepEqual(resume.types, { fiche: 1, precision: 1 });
  });

  it("juge stables les réponses sans démarche quand leur type ne change pas", () => {
    const resumes = resumerRepetitions([
      { question: "inconnue", reponses: [inconnue, { type: "inconnue", message: "Je n'ai pas encore cette source." }] },
      { question: "hors", reponses: [horsDomaine, horsDomaine] },
      { question: "vague", reponses: [precisionGenerale, { type: "precision_generale", question: "Autre formulation ?" }] },
    ]);

    assert.deepEqual(
      resumes.map((resume) => [resume.question, resume.stable, resume.slugs]),
      [
        ["inconnue", true, []],
        ["hors", true, []],
        ["vague", true, []],
      ],
    );
  });

  it("juge stable une seule réponse, et non stable l'absence de réponse", () => {
    const [seule, aucune] = resumerRepetitions([
      { question: "une fois", reponses: [fiche()] },
      { question: "jamais posée", reponses: [] },
    ]);

    assert.equal(seule.stable, true);
    assert.deepEqual(aucune, { question: "jamais posée", stable: false, types: {}, slugs: [] });
  });

  it("résume chaque question à part, dans l'ordre reçu, même si deux ont le même texte", () => {
    const resumes = resumerRepetitions([
      { question: "même", reponses: [fiche(carte), fiche(carte)] },
      { question: "même", reponses: [fiche(carte), inconnue] },
    ]);

    assert.deepEqual(
      resumes.map((resume) => resume.stable),
      [true, false],
    );
    assert.deepEqual(resumerRepetitions([]), []);
  });
});
