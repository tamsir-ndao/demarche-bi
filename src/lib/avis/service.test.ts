// Tests du service d'avis (la route /api/feedback et le journal des réponses), avec de vraies requêtes et un faux journal :
// aucune base, aucun réseau. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Reponse } from "../ai/ask";
import type { Fiche } from "../fiches/schema";
import type { Avis } from "./avis";
import type { EntreeJournal, Journal } from "./journal";
import { creerServiceAvis, TAILLE_MAX_AVIS_OCTETS } from "./service";

const IDENTIFIANT = "3f2a9c1e-5b7d-4e8a-9c3b-1a2b3c4d5e6f";
const AUTRE_IDENTIFIANT = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

/** Faux journal : note ce qu'on lui demande d'écrire, et peut refuser d'écrire. */
function fauxJournal(ecrit = true) {
  const reponses: { id: string; entree: EntreeJournal }[] = [];
  const avis: Avis[] = [];
  const journal: Journal = {
    async noterReponse(id, entree) {
      reponses.push({ id, entree });
      return ecrit;
    },
    async noterAvis(donnees) {
      avis.push(donnees);
      return ecrit;
    },
  };
  return { journal, reponses, avis };
}

function limiteur(permis: boolean) {
  const visiteurs: string[] = [];
  return {
    autoriser(visiteur: string) {
      visiteurs.push(visiteur);
      return permis;
    },
    visiteurs,
  };
}

type Options = { journal?: Journal | null; avisPermis?: boolean; journalPermis?: boolean; ecrit?: boolean };

function service({ journal, avisPermis = true, journalPermis = true, ecrit = true }: Options = {}) {
  const base = fauxJournal(ecrit);
  const travaux: (() => Promise<unknown>)[] = [];
  const limiteAvis = limiteur(avisPermis);
  const limiteJournal = limiteur(journalPermis);
  const identifiants = [IDENTIFIANT, AUTRE_IDENTIFIANT];
  const instance = creerServiceAvis({
    journal: journal === undefined ? base.journal : journal,
    limiteurAvis: limiteAvis,
    limiteurJournal: limiteJournal,
    apres: (travail) => travaux.push(travail),
    nouvelIdentifiant: () => identifiants.shift() ?? "plus-d-identifiant",
  });
  return { instance, base, travaux, limiteAvis, limiteJournal };
}

const fiche = { slug: "carte-identite" } as Fiche;
const reponseFiche: Reponse = { type: "fiche", fiche, autres: [], intro: null, degrade: null, rejet: null };

describe("noterLaReponse", () => {
  it("rend l'identifiant de la réponse et l'écrit après l'envoi de la page, pas pendant", async () => {
    const { instance, base, travaux } = service();

    const id = instance.noterLaReponse("Combien coûte la carte ?", reponseFiche, "203.0.113.7");

    assert.equal(id, IDENTIFIANT);
    assert.equal(travaux.length, 1);
    assert.deepEqual(base.reponses, []);

    await travaux[0]();
    assert.deepEqual(base.reponses, [
      { id: IDENTIFIANT, entree: { question: "Combien coûte la carte ?", repondue: true, fiches: ["carte-identite"] } },
    ]);
  });

  it("note aussi « je ne sais pas encore »", async () => {
    const { instance, base, travaux } = service();

    assert.equal(instance.noterLaReponse("une question", { type: "inconnue" }), IDENTIFIANT);
    await travaux[0]();

    assert.deepEqual(base.reponses[0].entree, { question: "une question", repondue: false, fiches: [] });
  });

  it("ne note rien (et ne rend pas d'identifiant) pour une question de précision", () => {
    const { instance, travaux } = service();

    assert.equal(instance.noterLaReponse("carte", { type: "precision_generale", question: "Peux-tu préciser ?" }), null);
    assert.equal(travaux.length, 0);
  });

  it("ne note rien sans base de données", () => {
    const { instance, travaux } = service({ journal: null });

    assert.equal(instance.noterLaReponse("carte", reponseFiche), null);
    assert.equal(travaux.length, 0);
  });

  it("ne note plus rien quand un visiteur recharge la page en boucle (la limite compte le visiteur, pas la question)", () => {
    const { instance, travaux, limiteJournal } = service({ journalPermis: false });

    assert.equal(instance.noterLaReponse("carte", reponseFiche, "203.0.113.7"), null);
    assert.deepEqual(limiteJournal.visiteurs, ["203.0.113.7"]);
    assert.equal(travaux.length, 0);
  });

  it("ne limite pas quand on ne connaît pas le visiteur", () => {
    const { instance, limiteJournal } = service({ journalPermis: false });

    assert.equal(instance.noterLaReponse("carte", reponseFiche), IDENTIFIANT);
    assert.deepEqual(limiteJournal.visiteurs, []);
  });

  it("ne compte pas dans la limite les réponses qu'il ne note pas", () => {
    const { instance, limiteJournal } = service();

    instance.noterLaReponse("carte", { type: "precision", options: [], question: "Laquelle ?" }, "203.0.113.7");

    assert.deepEqual(limiteJournal.visiteurs, []);
  });
});

const demande = (corps: BodyInit | null, entetes: Record<string, string> = {}) =>
  new Request("http://site.test/api/feedback", { method: "POST", body: corps, headers: entetes });

const json = (valeur: unknown, entetes: Record<string, string> = {}) => demande(JSON.stringify(valeur), entetes);

const visiteur = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };

describe("enregistrerLAvis", () => {
  it("écrit un avis valide", async () => {
    const { instance, base } = service();

    const resultat = await instance.enregistrerLAvis(json({ journalId: IDENTIFIANT, utile: false, commentaire: " Il manque le prix " }));

    assert.deepEqual(resultat, { ok: true });
    assert.deepEqual(base.avis, [{ journalId: IDENTIFIANT, utile: false, commentaire: "Il manque le prix" }]);
  });

  it("refuse un corps qui n'est pas du JSON", async () => {
    const { instance, base } = service();

    assert.deepEqual(await instance.enregistrerLAvis(demande("pas du json")), { ok: false, code: "avis_invalide", statut: 400 });
    assert.deepEqual(await instance.enregistrerLAvis(demande(null)), { ok: false, code: "avis_invalide", statut: 400 });
    assert.deepEqual(base.avis, []);
  });

  it("refuse un avis mal formé", async () => {
    const { instance, base } = service();

    assert.deepEqual(await instance.enregistrerLAvis(json({ journalId: "abc", utile: true })), { ok: false, code: "avis_invalide", statut: 400 });
    assert.deepEqual(await instance.enregistrerLAvis(json({ journalId: IDENTIFIANT })), { ok: false, code: "avis_invalide", statut: 400 });
    assert.deepEqual(base.avis, []);
  });

  it("refuse un corps trop gros, annoncé ou non", async () => {
    const { instance, base } = service();
    const gros = JSON.stringify({ journalId: IDENTIFIANT, utile: true, commentaire: "a".repeat(TAILLE_MAX_AVIS_OCTETS) });

    // Un avis qui serait valide, mais dont la taille annoncée dépasse la limite : il est refusé sans être lu.
    const valide = JSON.stringify({ journalId: IDENTIFIANT, utile: true });
    const annonce = demande(valide, { "content-length": String(TAILLE_MAX_AVIS_OCTETS + 1) });
    assert.deepEqual(await instance.enregistrerLAvis(annonce), { ok: false, code: "avis_invalide", statut: 400 });
    assert.deepEqual(await instance.enregistrerLAvis(demande(gros)), { ok: false, code: "avis_invalide", statut: 400 });
    assert.deepEqual(base.avis, []);
  });

  it("limite le nombre d'avis par visiteur, avant même de lire l'avis", async () => {
    const { instance, base, limiteAvis } = service({ avisPermis: false });

    const resultat = await instance.enregistrerLAvis(json({ journalId: IDENTIFIANT, utile: true }, visiteur));

    assert.deepEqual(resultat, { ok: false, code: "trop_de_demandes", statut: 429 });
    assert.deepEqual(limiteAvis.visiteurs, ["203.0.113.7"]);
    assert.deepEqual(base.avis, []);

    const invalide = await instance.enregistrerLAvis(demande("pas du json", visiteur));
    assert.deepEqual(invalide, { ok: false, code: "trop_de_demandes", statut: 429 });
  });

  it("ne limite pas quand on ne connaît pas le visiteur", async () => {
    const { instance, limiteAvis } = service({ avisPermis: false });

    assert.deepEqual(await instance.enregistrerLAvis(json({ journalId: IDENTIFIANT, utile: true })), { ok: true });
    assert.deepEqual(limiteAvis.visiteurs, []);
  });

  it("dit « indisponible » quand la base refuse l'écriture", async () => {
    const { instance } = service({ ecrit: false });

    assert.deepEqual(await instance.enregistrerLAvis(json({ journalId: IDENTIFIANT, utile: true })), {
      ok: false,
      code: "indisponible",
      statut: 503,
    });
  });

  it("dit « indisponible » sans base de données", async () => {
    const { instance } = service({ journal: null });

    assert.deepEqual(await instance.enregistrerLAvis(json({ journalId: IDENTIFIANT, utile: true })), {
      ok: false,
      code: "indisponible",
      statut: 503,
    });
  });
});
