// Tests du journal anonyme : ce qui est écrit dans la base (avec une fausse base) et ce qui ne l'est jamais. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Reponse } from "../ai/ask";
import type { Fiche } from "../fiches/schema";
import { creerJournal, entreeDeLaReponse, LONGUEUR_MAX_QUESTION_JOURNAL, type Requete } from "./journal";

const IDENTIFIANT = "3f2a9c1e-5b7d-4e8a-9c3b-1a2b3c4d5e6f";

type Appel = { texte: string; valeurs: readonly unknown[] };

/** Fausse base : note chaque requête reçue, et échoue si on le lui demande. */
function fausseBase(echec?: Error) {
  const appels: Appel[] = [];
  const requete: Requete = async (texte, valeurs) => {
    appels.push({ texte, valeurs });
    if (echec) throw echec;
    return [];
  };
  return { requete, appels };
}

const fiche = (slug: string) => ({ slug }) as Fiche;

describe("entreeDeLaReponse", () => {
  it("note une fiche montrée : répondue, avec son identifiant", () => {
    const reponse: Reponse = { type: "fiche", fiche: fiche("carte-identite"), autres: [fiche("passeport")], intro: null, degrade: null, rejet: null };
    assert.deepEqual(entreeDeLaReponse("ma carte", reponse), { question: "ma carte", repondue: true, fiches: ["carte-identite"] });
  });

  it("note « je ne sais pas encore » : non répondue, sans fiche", () => {
    assert.deepEqual(entreeDeLaReponse("une question", { type: "inconnue" }), { question: "une question", repondue: false, fiches: [] });
  });

  it("note aussi une question hors domaine comme non répondue, sans fiche", () => {
    const reponse: Reponse = { type: "hors_domaine", message: "Ce n’est pas mon domaine." };
    assert.deepEqual(entreeDeLaReponse("une recette", reponse), { question: "une recette", repondue: false, fiches: [] });
    assert.deepEqual(entreeDeLaReponse("une recette", { type: "hors_domaine" }), { question: "une recette", repondue: false, fiches: [] });
  });

  it("ne note pas les questions de précision : la réponse viendra après", () => {
    assert.equal(entreeDeLaReponse("carte", { type: "precision", options: [fiche("a"), fiche("b")], question: "Laquelle ?" }), null);
    assert.equal(entreeDeLaReponse("carte", { type: "precision_generale", question: "Peux-tu préciser ?" }), null);
  });
});

describe("noterReponse", () => {
  it("écrit la réponse dans question_logs avec les seules colonnes prévues", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });

    const note = await journal.noterReponse(IDENTIFIANT, { question: "Combien coûte la carte ?", repondue: true, fiches: ["carte-identite"] });

    assert.equal(note, true);
    assert.equal(base.appels.length, 1);
    assert.match(base.appels[0].texte, /^insert into question_logs \(id, question, answered, fiche_slugs\) values \(\$1, \$2, \$3, \$4\)$/);
    assert.deepEqual(base.appels[0].valeurs, [IDENTIFIANT, "Combien coûte la carte ?", true, ["carte-identite"]]);
  });

  it("coupe la question à la limite de la base, sans casser un emoji", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });
    const longue = "é".repeat(LONGUEUR_MAX_QUESTION_JOURNAL - 1) + "👍👍";

    await journal.noterReponse(IDENTIFIANT, { question: longue, repondue: false, fiches: [] });

    const question = base.appels[0].valeurs[1] as string;
    assert.equal(Array.from(question).length, LONGUEUR_MAX_QUESTION_JOURNAL);
    assert.equal(question.endsWith("é👍"), true);
  });

  it("rend faux, garde la trace de la panne et ne lève rien quand la base échoue", async () => {
    const base = fausseBase(new Error("connexion refusée"));
    const signalees: unknown[][] = [];
    const journal = creerJournal({ requete: base.requete, signaler: (...infos) => signalees.push(infos) });

    const note = await journal.noterReponse(IDENTIFIANT, { question: "q", repondue: true, fiches: [] });

    assert.equal(note, false);
    assert.equal(signalees.length, 1);
    assert.equal(signalees[0][0], "reponse");
    assert.ok(signalees[0][1] instanceof Error);
  });
});

describe("noterAvis", () => {
  it("écrit l'avis dans feedback, rattaché à la réponse si elle est dans le journal", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });

    const note = await journal.noterAvis({ journalId: IDENTIFIANT, utile: false, commentaire: "Il manque le prix" });

    assert.equal(note, true);
    assert.equal(base.appels.length, 1);
    // Si la réponse n'a pas pu être écrite, le sous-select rend « rien » : l'avis est gardé sans rattachement plutôt que perdu.
    assert.match(base.appels[0].texte, /^insert into feedback \(question_log_id, helpful, comment\) values \(\(select id from question_logs where id = \$1\), \$2, \$3\)$/);
    assert.deepEqual(base.appels[0].valeurs, [IDENTIFIANT, false, "Il manque le prix"]);
  });

  it("écrit un avis sans commentaire avec une valeur nulle", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });

    await journal.noterAvis({ journalId: IDENTIFIANT, utile: true, commentaire: null });

    assert.deepEqual(base.appels[0].valeurs, [IDENTIFIANT, true, null]);
  });

  it("rend faux, garde la trace de la panne et ne lève rien quand la base échoue", async () => {
    const base = fausseBase(new Error("trop lent"));
    const signalees: unknown[][] = [];
    const journal = creerJournal({ requete: base.requete, signaler: (...infos) => signalees.push(infos) });

    const note = await journal.noterAvis({ journalId: IDENTIFIANT, utile: true, commentaire: null });

    assert.equal(note, false);
    assert.equal(signalees[0][0], "avis");
  });
});
