// Tests du parcours complet d'une question (comprendre, décider, répondre, vérifier) avec un faux modèle.
// Aucune requête réseau. Lancer : npm test
// Les fiches ci-dessous sont des données FICTIVES de test.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { poserQuestion } from "./ask";
import { ErreurIA } from "./client";
import { ficheDeTest } from "./fiche-de-test";
import { modeleDeTest } from "./modele-de-test";

const carte = ficheDeTest({
  slug: "carte",
  titre: "Carte d'identité nationale",
  resume: "Demande de la carte d'identité, valable 10 ans.",
  mots_cles: ["carte", "identité", "CNI"],
  pieces: ["Un extrait de naissance", "Un timbre de 10 000 FCFA"],
  etapes: ["Se rendre au commissariat de police.", "Déposer la demande."],
  cout: "Timbre de 10 000 FCFA",
});
const duplicata = ficheDeTest({
  slug: "duplicata",
  titre: "Duplicata de la carte d'identité",
  resume: "Refaire la carte d'identité perdue.",
  mots_cles: ["duplicata", "carte", "identité", "perdue"],
  etapes: ["Obtenir un certificat de perte."],
});
const passeport = ficheDeTest({
  slug: "passeport",
  titre: "Passeport biométrique",
  resume: "Demande d'un passeport biométrique.",
  mots_cles: ["passeport", "voyage", "biométrique"],
  etapes: ["Prendre rendez-vous."],
});
const fiches = [carte, duplicata, passeport];

const orienter = (surcharges: object) => ({
  question_claire: "Question claire ?",
  demarches: [],
  besoin_precision: false,
  question_precision: "",
  hors_domaine: false,
  message_hors_domaine: "",
  message_absente: "",
  ...surcharges,
});
const reponseCarte = { trouve: true, intro: "Tu as besoin d'un timbre de 10 000 FCFA." };
const slugs = (liste: { slug: string }[]) => liste.map((f) => f.slug);

describe("poserQuestion avec l'IA", () => {
  it("répond avec la fiche choisie, avec l'introduction de l'IA, et propose les fiches voisines", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["carte"] }), reponseCarte);
    const reponse = await poserQuestion("Combien coûte la carte d'identité ?", { fiches, modele });

    assert.equal(reponse.type, "fiche");
    if (reponse.type !== "fiche") return;
    assert.equal(reponse.fiche.slug, "carte");
    assert.equal(reponse.intro, reponseCarte.intro);
    assert.equal(reponse.degrade, null);
    assert.equal(reponse.rejet, null);
    assert.deepEqual(slugs(reponse.autres), ["duplicata"]);
    assert.deepEqual(
      appels.map((a) => a.nom),
      ["comprehension", "reponse"],
    );
  });

  it("donne au modèle la question reformulée et la seule fiche choisie", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["carte"], question_claire: "Que coûte la CNI ?" }), reponseCarte);
    await poserQuestion("ñaata la CNI ?", { fiches, modele });

    const message = appels[1].messages[1].content;
    assert.match(message, /Question : ñaata la CNI \?/);
    assert.match(message, /Reformulée : Que coûte la CNI \?/);
    assert.match(message, /TITRE : Carte d'identité nationale/);
    assert.doesNotMatch(message, /Passeport|Duplicata/);
  });

  it("dit « inconnue » sans écrire de réponse quand aucune démarche ne convient", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: [] }));
    assert.deepEqual(await poserQuestion("Quel temps demain ?", { fiches, modele }), { type: "inconnue" });
    assert.equal(appels.length, 1);
  });

  it("rend la phrase écrite par le modèle quand une démarche absente de la liste ne reçoit pas de fiche", async () => {
    const { modele } = modeleDeTest(orienter({ message_absente: "Je n’ai pas encore de source officielle pour le visa." }));
    assert.deepEqual(await poserQuestion("Comment obtenir un visa ?", { fiches, modele }), {
      type: "inconnue",
      message: "Je n’ai pas encore de source officielle pour le visa.",
    });
  });

  it("dit « hors domaine » avec sa phrase quand la question n'a aucun rapport avec les démarches", async () => {
    const message = "Les recettes, ce n’est pas mon domaine. Je t’aide pour les démarches administratives au Sénégal.";
    const { modele, appels } = modeleDeTest(orienter({ hors_domaine: true, message_hors_domaine: message }));
    assert.deepEqual(await poserQuestion("Comment faire du thiéboudienne ?", { fiches, modele }), { type: "hors_domaine", message });
    assert.equal(appels.length, 1, "aucune réponse n'est écrite");
  });

  it("demande de préciser entre plusieurs démarches", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["carte", "duplicata"], question_precision: "Tu l'as perdue ?" }));
    const reponse = await poserQuestion("Carte d'identité", { fiches, modele });

    assert.equal(reponse.type, "precision");
    if (reponse.type === "precision") {
      assert.deepEqual(slugs(reponse.options), ["carte", "duplicata"]);
      assert.equal(reponse.question, "");
    }
    assert.equal(appels.length, 1);
  });

  it("demande de préciser quand la question est trop vague", async () => {
    const { modele } = modeleDeTest(orienter({ besoin_precision: true, question_precision: "De quel papier ?" }));
    assert.deepEqual(await poserQuestion("Je veux un papier", { fiches, modele }), {
      type: "precision_generale",
      question: "De quel papier ?",
    });
  });

  it("dit « inconnue » quand la fiche ne traite pas de la question", async () => {
    const { modele } = modeleDeTest(orienter({ demarches: ["carte"] }), { trouve: false, intro: "" });
    assert.deepEqual(await poserQuestion("Carte d'identité française ?", { fiches, modele }), { type: "inconnue" });
  });

  it("montre la fiche telle qu'elle est écrite quand les garde-fous rejettent la réponse", async () => {
    const inventee = { ...reponseCarte, intro: "Tu paies 15 000 FCFA." };
    const { modele } = modeleDeTest(orienter({ demarches: ["carte"] }), inventee);
    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele });

    assert.equal(reponse.type, "fiche");
    if (reponse.type !== "fiche") return;
    assert.equal(reponse.fiche.slug, "carte");
    assert.equal(reponse.intro, null);
    assert.equal(reponse.degrade, null);
    assert.match(reponse.rejet ?? "", /15000/);
  });

  it("redemande une réponse en donnant la raison du refus, et montre la seconde si elle est fidèle", async () => {
    const inventee = { ...reponseCarte, intro: "Tu paies 15 000 FCFA." };
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["carte"] }), inventee, reponseCarte);
    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele });

    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") {
      assert.equal(reponse.intro, reponseCarte.intro);
      assert.equal(reponse.rejet, null);
    }
    assert.equal(appels.length, 3);
    assert.match(appels[2].messages[2].content, /15000/);
  });

  it("ne redemande qu'une fois, puis montre la fiche telle qu'elle est écrite", async () => {
    const inventee = { ...reponseCarte, intro: "Tu paies 15 000 FCFA." };
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["carte"] }), inventee, inventee, reponseCarte);
    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele });

    assert.equal(appels.length, 3);
    assert.equal(reponse.type === "fiche" ? reponse.intro : "autre", null);
    assert.match(reponse.type === "fiche" ? (reponse.rejet ?? "") : "", /15000/);
  });

  it("garde la première raison du refus quand la seconde réponse dit que la fiche ne répond pas", async () => {
    const inventee = { ...reponseCarte, intro: "Tu paies 15 000 FCFA." };
    const { modele } = modeleDeTest(orienter({ demarches: ["carte"] }), inventee, { trouve: false, intro: "" });
    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele });

    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") {
      assert.equal(reponse.intro, null);
      assert.match(reponse.rejet ?? "", /15000/);
    }
  });

  it("ne redemande pas quand la fiche ne traite pas de la question", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["carte"] }), { trouve: false, intro: "" });
    await poserQuestion("Carte d'identité française ?", { fiches, modele });
    assert.equal(appels.length, 2);
  });

  it("ne redemande pas quand l'IA est en panne", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["carte"] }), new ErreurIA("Panne", "indisponible"));
    await poserQuestion("Combien coûte la carte ?", { fiches, modele });
    assert.equal(appels.length, 2);
  });

  it("rejette une réponse qui cite l'identifiant interne d'une autre fiche", async () => {
    const perte = ficheDeTest({ slug: "carte-perdue", titre: "Carte perdue", etapes: ["Aller au guichet."] });
    const avecIdentifiant = { ...reponseCarte, intro: "Pour une carte perdue, voir la fiche carte-perdue." };
    const { modele } = modeleDeTest(orienter({ demarches: ["carte"] }), avecIdentifiant);
    const reponse = await poserQuestion("Carte perdue ?", { fiches: [...fiches, perte], modele });
    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") {
      assert.equal(reponse.intro, null);
      assert.match(reponse.rejet ?? "", /identifiant/i);
    }
  });

  it("montre la fiche telle qu'elle est écrite quand l'IA ne peut pas rédiger, et dit pourquoi", async () => {
    const { modele } = modeleDeTest(orienter({ demarches: ["carte"] }), new ErreurIA("Saturé", "saturee"));
    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele });

    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") {
      assert.equal(reponse.fiche.slug, "carte");
      assert.equal(reponse.intro, null);
      assert.equal(reponse.degrade, "saturee");
    }
  });

  it("ne prévient pas l'utilisateur quand l'IA n'est tout simplement pas configurée", async () => {
    const { modele } = modeleDeTest(orienter({ demarches: ["carte"] }), new ErreurIA("Pas de clé", "non_configuree"));
    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele });
    assert.equal(reponse.type === "fiche" ? reponse.degrade : "autre", null);

    const sansCle = modeleDeTest(new ErreurIA("Pas de clé", "non_configuree"));
    const repli = await poserQuestion("passeport voyage", { fiches, modele: sansCle.modele });
    assert.equal(repli.type === "fiche" ? repli.degrade : "autre", null);
  });

  it("signale les pannes de l'IA à qui veut les journaliser", async () => {
    const panne = new ErreurIA("Panne", "indisponible");
    const { modele } = modeleDeTest(orienter({ demarches: ["carte"] }), panne);
    const signalements: unknown[][] = [];
    await poserQuestion("Combien coûte la carte ?", { fiches, modele, signaler: (...args) => signalements.push(args) });
    assert.deepEqual(signalements, [["repondre", panne]]);
  });
});

describe("poserQuestion sans l'IA", () => {
  it("cherche dans les fiches avec les mots de la question quand l'IA est en panne", async () => {
    const { modele } = modeleDeTest(new ErreurIA("Panne", "indisponible"));
    const reponse = await poserQuestion("passeport voyage", { fiches, modele });

    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") {
      assert.equal(reponse.fiche.slug, "passeport");
      assert.equal(reponse.intro, null);
      assert.equal(reponse.degrade, "indisponible");
    }
  });

  it("dit « inconnue » quand l'IA est en panne et que la recherche ne trouve rien", async () => {
    const { modele } = modeleDeTest(new ErreurIA("Saturé", "saturee"));
    assert.deepEqual(await poserQuestion("recette du thiéboudienne", { fiches, modele }), { type: "inconnue" });
  });

  it("fonctionne sans modèle configuré, sans prévenir l'utilisateur", async () => {
    const reponse = await poserQuestion("passeport voyage", { fiches, modele: null });
    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") {
      assert.equal(reponse.fiche.slug, "passeport");
      assert.equal(reponse.intro, null);
      assert.equal(reponse.degrade, null);
    }
  });

  it("garde les fiches voisines dans « voir aussi »", async () => {
    const reponse = await poserQuestion("carte d'identité perdue duplicata", { fiches, modele: null });
    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") {
      assert.equal(reponse.fiche.slug, "duplicata");
      assert.deepEqual(slugs(reponse.autres), ["carte"]);
    }
  });
});

describe("poserQuestion avec une démarche choisie", () => {
  it("saute la compréhension et répond avec la fiche choisie", async () => {
    const { modele, appels } = modeleDeTest(reponseCarte);
    const reponse = await poserQuestion("Carte d'identité", { fiches, modele, ficheSlug: "carte" });

    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") assert.equal(reponse.fiche.slug, "carte");
    assert.deepEqual(
      appels.map((a) => a.nom),
      ["reponse"],
    );
  });

  it("ignore une démarche inconnue et comprend la question", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["passeport"] }), { trouve: true, intro: "Prends rendez-vous." });
    const reponse = await poserQuestion("passeport", { fiches, modele, ficheSlug: "inventee" });

    assert.equal(reponse.type, "fiche");
    if (reponse.type === "fiche") assert.equal(reponse.fiche.slug, "passeport");
    assert.equal(appels[0].nom, "comprehension");
  });
});

describe("poserQuestion sans fiche", () => {
  it("dit « inconnue » sans appeler le modèle", async () => {
    const { modele, appels } = modeleDeTest(orienter({}));
    assert.deepEqual(await poserQuestion("passeport", { fiches: [], modele }), { type: "inconnue" });
    assert.equal(appels.length, 0);
  });
});

describe("poserQuestion avec une demande frauduleuse", () => {
  it("refuse immédiatement sans appeler le modèle ni chercher de fiche", async () => {
    const { modele, appels } = modeleDeTest(orienter({ demarches: ["passeport"] }));
    const reponse = await poserQuestion("Comment fabriquer un faux passeport à Dakar ?", { fiches, modele });
    assert.equal(reponse.type, "interdit");
    if (reponse.type === "interdit") {
      assert.match(reponse.message ?? "", /interdite par la loi/i);
    }
    assert.equal(appels.length, 0);
  });

  it("refuse aussi en mode repli par mots (sans modèle)", async () => {
    const reponse = await poserQuestion("Acheter un faux permis de conduire", { fiches, modele: null });
    assert.equal(reponse.type, "interdit");
    if (reponse.type === "interdit") {
      assert.match(reponse.message ?? "", /interdite par la loi/i);
    }
  });
});
