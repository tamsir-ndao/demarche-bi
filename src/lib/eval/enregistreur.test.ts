// Tests de l'enregistreur des sorties brutes du modèle. Faux modèle, aucune requête réseau. Lancer : npm test
// Les fiches ci-dessous sont des données FICTIVES de test ; la clé citée dans les erreurs est une valeur de test.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { poserQuestion } from "../ai/ask";
import { ErreurIA } from "../ai/client";
import { ficheDeTest } from "../ai/fiche-de-test";
import { modeleDeTest } from "../ai/modele-de-test";
import { ReponseIASchema } from "../ai/schemas";
import { enregistrerAppels } from "./enregistreur";

const carte = ficheDeTest({
  slug: "carte",
  titre: "Carte d'identité nationale",
  resume: "Demande de la carte d'identité.",
  mots_cles: ["carte", "identité", "CNI"],
  pieces: ["Un extrait de naissance"],
  etapes: ["Se rendre au commissariat de police."],
  cout: "Timbre de 10 000 FCFA",
});
const fiches = [carte];

const orienter = (surcharges: object = {}) => ({
  question_claire: "Question claire ?",
  demarches: ["carte"],
  besoin_precision: false,
  question_precision: "",
  hors_domaine: false,
  message_hors_domaine: "",
  message_absente: "",
  ...surcharges,
});
const introHonnete = { trouve: true, intro: "Tu as besoin d'un timbre de 10 000 FCFA." };
const introInventee = { trouve: true, intro: "Le timbre coûte 5 000 FCFA." };

const CLE = "clé-de-test";

describe("enregistrerAppels : ce qui est noté", () => {
  it("note chaque appel dans l'ordre, avec le nom du schéma et ce que le modèle a rendu", async () => {
    const { modele, appels: inner } = modeleDeTest(orienter(), introHonnete);
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(reponse.type, "fiche");
    assert.deepEqual(enregistreur.appels, [
      { nom: "comprehension", sortie: orienter(), erreur: null },
      { nom: "reponse", sortie: introHonnete, erreur: null },
    ]);
    assert.equal(inner.length, 2);
  });

  it("donne au modèle enveloppé l'appel tel quel et rend sa sortie sans la changer", async () => {
    const { modele, appels: inner } = modeleDeTest(introHonnete);
    const enregistreur = enregistrerAppels(modele);
    const appel = {
      nom: "reponse",
      schema: ReponseIASchema,
      messages: [{ role: "user" as const, content: "Bonjour" }],
      maxTokens: 100,
    };

    const sortie = await enregistreur.modele(appel);

    assert.equal(inner[0], appel);
    assert.deepEqual(sortie, introHonnete);
    assert.equal(enregistreur.appels[0].sortie, sortie);
  });

  it("vide la liste sans la remplacer : la liste déjà obtenue reste la bonne", async () => {
    const { modele } = modeleDeTest(orienter(), introHonnete, orienter(), introHonnete);
    const enregistreur = enregistrerAppels(modele);
    const liste = enregistreur.appels;
    await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });
    assert.equal(liste.length, 2);

    enregistreur.vider();
    assert.equal(liste.length, 0);
    assert.equal(enregistreur.introBrute(), null);

    await poserQuestion("Où demander la carte ?", { fiches, modele: enregistreur.modele });
    assert.equal(liste.length, 2);
    assert.equal(enregistreur.appels, liste);
  });
});

describe("enregistrerAppels : les erreurs", () => {
  it("note la nature et les motifs d'une panne de l'IA, puis relance la même erreur", async () => {
    const panne = new ErreurIA("Tous les fournisseurs IA ont échoué.", "saturee", ["principal : HTTP 429", "secours : HTTP 429"]);
    const { modele } = modeleDeTest(panne);
    const enregistreur = enregistrerAppels(modele);
    const appel = { nom: "comprehension", schema: ReponseIASchema, messages: [], maxTokens: 10 };

    await assert.rejects(enregistreur.modele(appel), (erreur) => erreur === panne);

    assert.deepEqual(enregistreur.appels, [
      { nom: "comprehension", sortie: null, erreur: "saturee (principal : HTTP 429 ; secours : HTTP 429)" },
    ]);
    assert.equal(enregistreur.introBrute(), null);
  });

  it("note seulement la nature quand l'erreur n'a pas de motifs", async () => {
    const { modele } = modeleDeTest(new ErreurIA("Pas de clé.", "non_configuree"));
    const enregistreur = enregistrerAppels(modele);
    await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(enregistreur.appels[0].erreur, "non_configuree");
  });

  it("ne recopie jamais le message d'une erreur inconnue, qui pourrait citer une clé", async () => {
    const { modele } = modeleDeTest(new Error(`échec de la requête (Authorization: Bearer ${CLE})`));
    const enregistreur = enregistrerAppels(modele);
    await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(enregistreur.appels[0].erreur, "erreur inattendue (Error)");
    assert.equal(JSON.stringify(enregistreur.appels).includes(CLE), false);
  });

  it("note aussi une valeur lancée qui n'est pas une erreur", async () => {
    const enregistreur = enregistrerAppels(async () => {
      throw `échec avec ${CLE}`;
    });
    const appel = { nom: "reponse", schema: ReponseIASchema, messages: [], maxTokens: 10 };

    await assert.rejects(enregistreur.modele(appel));

    assert.equal(enregistreur.appels[0].erreur, "erreur inattendue");
  });

  it("note un appel qui échoue même quand l'appel suivant réussit", async () => {
    const { modele } = modeleDeTest(orienter(), new ErreurIA("Panne.", "indisponible", ["principal : erreur réseau"]));
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    // L'IA tombe à l'étape « répondre » : la fiche est montrée sans introduction.
    assert.equal(reponse.type, "fiche");
    assert.deepEqual(
      enregistreur.appels.map((appel) => [appel.nom, appel.erreur]),
      [
        ["comprehension", null],
        ["reponse", "indisponible (principal : erreur réseau)"],
      ],
    );
    assert.equal(enregistreur.introBrute(), null);
  });
});

describe("enregistrerAppels : introBrute, l'introduction avant les garde-fous", () => {
  it("est l'introduction montrée quand le modèle écrit juste du premier coup", async () => {
    const { modele } = modeleDeTest(orienter(), introHonnete);
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(reponse.type === "fiche" ? reponse.intro : undefined, introHonnete.intro);
    assert.equal(enregistreur.introBrute(), introHonnete.intro);
  });

  it("garde la première version, inventée, quand la seconde chance donne une introduction propre", async () => {
    const { modele } = modeleDeTest(orienter(), introInventee, introHonnete);
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(reponse.type === "fiche" ? reponse.intro : undefined, introHonnete.intro);
    assert.equal(enregistreur.introBrute(), introInventee.intro);
    assert.equal(enregistreur.appels.filter((appel) => appel.nom === "reponse").length, 2);
  });

  it("garde la première version quand les deux sont refusées : la fiche est alors montrée sans introduction", async () => {
    const { modele } = modeleDeTest(orienter(), introInventee, { trouve: true, intro: "Compte 7 000 FCFA." });
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(reponse.type === "fiche" ? reponse.intro : undefined, null);
    assert.equal(enregistreur.introBrute(), introInventee.intro);
  });

  it("existe aussi quand la démarche est choisie sur l'écran de précision (pas d'appel « comprehension »)", async () => {
    const { modele } = modeleDeTest(introInventee, introHonnete);
    const enregistreur = enregistrerAppels(modele);

    await poserQuestion("carte", { fiches, modele: enregistreur.modele, ficheSlug: "carte" });

    assert.deepEqual(
      enregistreur.appels.map((appel) => appel.nom),
      ["reponse", "reponse"],
    );
    assert.equal(enregistreur.introBrute(), introInventee.intro);
  });

  it("est nulle quand le modèle dit que la fiche ne traite pas la question", async () => {
    const { modele } = modeleDeTest(orienter(), { trouve: false, intro: "" });
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Combien coûte le passeport ?", { fiches, modele: enregistreur.modele });

    assert.equal(reponse.type, "inconnue");
    assert.equal(enregistreur.introBrute(), null);
  });

  it("est nulle quand le modèle n'écrit rien, ou que du blanc", async () => {
    const { modele } = modeleDeTest(orienter(), { trouve: true, intro: "   " });
    const enregistreur = enregistrerAppels(modele);

    await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(enregistreur.introBrute(), null);
  });

  it("est nulle avant tout appel, et quand la question est trop vague pour appeler « répondre »", async () => {
    const { modele } = modeleDeTest(orienter({ demarches: [], besoin_precision: true, question_precision: "De quoi s'agit-il ?" }));
    const enregistreur = enregistrerAppels(modele);
    assert.equal(enregistreur.introBrute(), null);

    const reponse = await poserQuestion("un papier", { fiches, modele: enregistreur.modele });

    assert.equal(reponse.type, "precision_generale");
    assert.equal(enregistreur.introBrute(), null);
  });

  it("rend la phrase « pas mon domaine » du modèle pour une question hors domaine", async () => {
    const phrase = "La cuisine, ce n'est pas mon domaine. Je t'aide pour les démarches administratives au Sénégal.";
    const { modele } = modeleDeTest(
      orienter({ demarches: [], hors_domaine: true, message_hors_domaine: phrase, message_absente: "Autre phrase." }),
    );
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Quelle est la recette du thiéboudienne ?", { fiches, modele: enregistreur.modele });

    assert.deepEqual(reponse, { type: "hors_domaine", message: phrase });
    assert.equal(enregistreur.introBrute(), phrase);
  });

  it("rend la phrase « pas encore de source » du modèle pour une démarche absente", async () => {
    const phrase = "Je n'ai pas encore de source officielle pour la vignette.";
    const { modele } = modeleDeTest(
      orienter({ demarches: [], message_hors_domaine: "Pas mon domaine.", message_absente: phrase }),
    );
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Comment payer la vignette ?", { fiches, modele: enregistreur.modele });

    assert.deepEqual(reponse, { type: "inconnue", message: phrase });
    assert.equal(enregistreur.introBrute(), phrase);
  });

  it("montre la phrase écrite par le modèle même quand les garde-fous l'ont écartée", async () => {
    const phrase = "La vignette coûte 5 000 FCFA, je n'ai pas encore la source.";
    const { modele } = modeleDeTest(orienter({ demarches: [], message_absente: phrase }));
    const enregistreur = enregistrerAppels(modele);

    const reponse = await poserQuestion("Comment payer la vignette ?", { fiches, modele: enregistreur.modele });

    assert.deepEqual(reponse, { type: "inconnue" });
    assert.equal(enregistreur.introBrute(), phrase);
  });

  it("est nulle quand le modèle n'a écrit aucune phrase", async () => {
    const { modele } = modeleDeTest(orienter({ demarches: [] }));
    const enregistreur = enregistrerAppels(modele);

    await poserQuestion("Comment payer la vignette ?", { fiches, modele: enregistreur.modele });

    assert.equal(enregistreur.introBrute(), null);
  });

  it("préfère l'introduction de la fiche à la phrase de la compréhension", async () => {
    const { modele } = modeleDeTest(orienter({ message_absente: "Une phrase inutile." }), introHonnete);
    const enregistreur = enregistrerAppels(modele);

    await poserQuestion("Combien coûte la carte ?", { fiches, modele: enregistreur.modele });

    assert.equal(enregistreur.introBrute(), introHonnete.intro);
  });
});
