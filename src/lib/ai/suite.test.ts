// Tests de la mémoire de conversation : « et ça coûte combien ? » parle de la démarche en cours. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Fiche } from "../fiches/schema";
import { lireDemandeApi } from "./api";
import { estUneSuite, poserQuestion } from "./ask";
import { comprendre } from "./understand";
import type { Modele } from "./structured";

const creer = (slug: string, titre: string) =>
  ({ slug, titre, resume: `Résumé de ${titre}`, mots_cles: [slug], categorie: "identite", pieces: [], etapes: ["Aller"], corps: "", statut: "verifie" }) as unknown as Fiche;
const passeport = creer("passeport", "Passeport ordinaire");
const permis = creer("permis", "Permis de conduire");
const fiches = [passeport, permis];

describe("estUneSuite", () => {
  it("reconnaît une question sur un détail, sans autre démarche nommée", () => {
    assert.equal(estUneSuite("Et ça coûte combien ?", fiches, passeport), true);
    assert.equal(estUneSuite("Où je dois aller ?", fiches, passeport), true);
  });
  it("laisse passer un changement de sujet", () => {
    assert.equal(estUneSuite("Combien coûte le permis ?", fiches, passeport), false);
    assert.equal(estUneSuite("Bonjour je cherche un travail à Dakar depuis longtemps", fiches, passeport), false);
  });
});

describe("poserQuestion avec une démarche en cours", () => {
  it("sans IA, une suite reste sur la démarche en cours", async () => {
    const reponse = await poserQuestion("Et ça coûte combien ?", { fiches, modele: null, contexte: "permis" });
    assert.equal(reponse.type === "fiche" && reponse.fiche.slug, "permis");
  });
  it("ignore une démarche en cours inconnue", async () => {
    const reponse = await poserQuestion("Et ça coûte combien ?", { fiches: [], modele: null, contexte: "inventee" });
    assert.equal(reponse.type, "inconnue");
  });
});

describe("comprendre avec une démarche en cours", () => {
  it("donne au modèle la démarche dont la conversation parle", async () => {
    let consignes = "";
    const modele = (async ({ messages }: { messages: { content: string }[] }) => {
      consignes = messages[0].content;
      return { question_claire: "q", demarches: ["permis"], besoin_precision: false, question_precision: "", hors_domaine: false, message_hors_domaine: "", message_absente: "" };
    }) as unknown as Modele;
    await comprendre("Où je dois aller ?", fiches, modele, permis);
    assert.match(consignes, /conversation parle[^]*permis/);
  });
});

describe("lireDemandeApi", () => {
  it("lit la démarche en cours", () => {
    const demande = lireDemandeApi({ question: "Combien ?", contexte: "permis" });
    assert.equal(demande.ok && demande.contexte, "permis");
  });
});
