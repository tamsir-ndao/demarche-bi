// Tests de la décision après la compréhension : répondre, demander une précision ou dire « je ne sais pas ».
// Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decider } from "./decide";
import { ficheDeTest } from "./fiche-de-test";
import type { Comprehension } from "./schemas";

const passeport = ficheDeTest({ slug: "passeport", titre: "Passeport biométrique" });
const carte = ficheDeTest({ slug: "carte", titre: "Carte d'identité" });
const casier = ficheDeTest({ slug: "casier", titre: "Casier judiciaire" });
const fiches = [passeport, carte, casier];

function comprise(surcharges: Partial<Comprehension>): Comprehension {
  return {
    question_claire: "Question claire ?",
    demarches: [],
    besoin_precision: false,
    question_precision: "",
    hors_domaine: false,
    message: "",
    ...surcharges,
  };
}

describe("decider", () => {
  it("répond avec la fiche choisie quand une seule démarche convient", () => {
    assert.deepEqual(decider(comprise({ demarches: ["carte"] }), fiches), { type: "fiche", fiche: carte });
  });

  it("dit « inconnue » quand aucune démarche ne convient", () => {
    assert.deepEqual(decider(comprise({ demarches: [] }), fiches), { type: "inconnue" });
  });

  it("demande de préciser entre plusieurs démarches, dans l'ordre du modèle", () => {
    const decision = decider(comprise({ demarches: ["casier", "carte"], question_precision: "" }), fiches);
    assert.deepEqual(decision, { type: "precision", options: [casier, carte], question: "" });
  });

  it("transmet la question de précision du modèle", () => {
    const decision = decider(
      comprise({ demarches: ["carte", "passeport"], besoin_precision: true, question_precision: "Que veux-tu faire ?" }),
      fiches,
    );
    assert.deepEqual(decision, { type: "precision", options: [carte, passeport], question: "Que veux-tu faire ?" });
  });

  it("demande une précision générale quand la question est trop vague, sans démarche à proposer", () => {
    const decision = decider(comprise({ besoin_precision: true, question_precision: "De quel papier as-tu besoin ?" }), fiches);
    assert.deepEqual(decision, { type: "precision_generale", question: "De quel papier as-tu besoin ?" });
  });

  it("demande une précision générale quand la question est trop vague, même avec une seule démarche proposée", () => {
    const decision = decider(comprise({ demarches: ["carte"], besoin_precision: true }), fiches);
    assert.deepEqual(decision, { type: "precision_generale", question: "" });
  });

  it("ignore les démarches qui ne figurent pas dans les fiches disponibles", () => {
    assert.deepEqual(decider(comprise({ demarches: ["inventee"] }), fiches), { type: "inconnue" });
    assert.deepEqual(decider(comprise({ demarches: ["inventee", "carte"] }), fiches), { type: "fiche", fiche: carte });
  });

  it("garde la phrase du modèle avec « inconnue » (démarche que le site n'a pas)", () => {
    assert.deepEqual(decider(comprise({ message: "Je n’ai pas encore de source pour le visa." }), fiches), {
      type: "inconnue",
      message: "Je n’ai pas encore de source pour le visa.",
    });
  });

  it("dit « hors domaine » quand le modèle le dit et qu'aucune démarche ne convient, avec sa phrase", () => {
    assert.deepEqual(decider(comprise({ hors_domaine: true, message: "Ce n’est pas mon domaine." }), fiches), {
      type: "hors_domaine",
      message: "Ce n’est pas mon domaine.",
    });
  });

  it("dit « hors domaine » sans phrase quand elle a été écartée", () => {
    assert.deepEqual(decider(comprise({ hors_domaine: true }), fiches), { type: "hors_domaine" });
  });

  it("répond avec la fiche même si le modèle dit aussi « hors domaine »", () => {
    assert.deepEqual(decider(comprise({ demarches: ["carte"], hors_domaine: true, message: "x" }), fiches), { type: "fiche", fiche: carte });
  });

  it("dit « inconnue », pas « hors domaine », quand les démarches du modèle n'existent pas", () => {
    assert.deepEqual(decider(comprise({ demarches: ["inventee"] }), fiches), { type: "inconnue" });
  });
});
