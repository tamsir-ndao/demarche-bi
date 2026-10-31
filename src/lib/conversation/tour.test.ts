// Tests d'un tour de conversation : ce que l'assistant affiche et dit. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Reponse } from "../ai/ask";
import type { Fiche } from "../fiches/schema";
import { construireTour } from "./tour";

const fiche = {
  slug: "passeport",
  titre: "Passeport ordinaire",
  cout: "20 000 FCFA",
  delai: "2 semaines",
  lieu: "Commissariat",
  pieces: ["Extrait de naissance", "Photo"],
  etapes: ["Déposer le dossier"],
  corps: "",
  sources: [{ titre: "Page officielle", url: "https://exemple.sn", consulte_le: "2026-10-01" }],
} as unknown as Fiche;
const statut = { aJour: true } as never;
const reponse: Extract<Reponse, { type: "fiche" }> = { type: "fiche", fiche, autres: [], intro: "Le passeport coûte 20 000 FCFA.", degrade: null, rejet: null };
const dit = (lignes: { texte: string }[]) => lignes.map((ligne) => ligne.texte).join(" ");

describe("construireTour", () => {
  it("dit l'essentiel de la fiche à la première question, sans renvoyer vers une page", () => {
    const tour = construireTour(reponse, { suite: false, statut });
    assert.match(dit(tour.lignes), /Coût : 20000 francs CFA/);
    assert.match(dit(tour.lignes), /Extrait de naissance/);
    assert.doesNotMatch(dit(tour.lignes), /juste en dessous/);
    assert.equal(tour.fiche?.slug, "passeport");
  });

  it("répond seulement à ce qui est demandé quand la conversation continue sur la même démarche", () => {
    const tour = construireTour(reponse, { suite: true, statut });
    assert.equal(dit(tour.lignes), "Le passeport coûte 20000 francs CFA.");
  });

  it("n'affiche que la réponse dans une suite : la fiche complète est déjà au-dessus", () => {
    const tour = construireTour(reponse, { suite: true, statut });
    assert.deepEqual(tour.faits, []);
    assert.deepEqual(tour.pieces, []);
    assert.equal(tour.fiche?.slug, "passeport");
  });

  it("indique e-Sénégal seulement pour une démarche vérifiée, avec sa limite, et le dit à voix haute", () => {
    const casier = { ...fiche, slug: "casier-judiciaire" } as unknown as Fiche;
    const tour = construireTour({ ...reponse, fiche: casier }, { suite: false, statut });
    assert.equal(tour.enLigne?.url, "https://e-senegal.sn/#/home/demarches");
    assert.match(tour.enLigne?.note ?? "", /juridictions pilotes/);
    assert.match(dit(tour.lignes), /e-Sénégal/);
    assert.equal(construireTour(reponse, { suite: false, statut }).enLigne, null);
  });

  it("redonne tous les faits de la fiche quand l'IA n'a pas écrit de phrase, même dans une suite", () => {
    const tour = construireTour({ ...reponse, intro: null }, { suite: true, statut });
    assert.match(dit(tour.lignes), /Coût : 20000 francs CFA/);
  });

  it("affiche les faits tels que la fiche les donne, et « non précisé » pour ce qu'elle ne dit pas", () => {
    const tour = construireTour({ ...reponse, fiche: { ...fiche, delai: null } as unknown as Fiche }, { suite: false, statut });
    assert.deepEqual(tour.faits[0], { libelle: "Coût", valeur: "20 000 FCFA" });
    assert.deepEqual(tour.faits[1], { libelle: "Délai", valeur: "Non précisé" });
    assert.deepEqual(tour.pieces, ["Extrait de naissance", "Photo"]);
  });

  it("prévient en langage simple quand un point est incertain, sans dire de date ni montrer la note de rédaction", () => {
    const incertaine = { ...fiche, corps: "- À confirmer : la rubrique de la page est vide." } as unknown as Fiche;
    const tour = construireTour({ ...reponse, fiche: incertaine }, { suite: false, statut });
    assert.match(tour.miseEnGarde ?? "", /Renseigne-toi/);
    assert.doesNotMatch(JSON.stringify({ ...tour, lignes: [] }), /rubrique|consultée/);
  });

  it("propose les démarches au choix quand la question ne suffit pas", () => {
    const tour = construireTour({ type: "precision", options: [fiche], question: "Que veux-tu faire ?" }, { suite: false });
    assert.deepEqual(tour.options, [{ slug: "passeport", titre: "Passeport ordinaire" }]);
    assert.equal(tour.fiche, null);
  });

  it("dit franchement qu'il ne sait pas", () => {
    const tour = construireTour({ type: "inconnue" }, { suite: false });
    assert.match(tour.texte.join(" "), /Je ne sais pas encore/);
    assert.match(dit(tour.lignes), /Je ne sais pas encore/);
  });

  it("garde la question à compléter quand elle est trop vague", () => {
    const tour = construireTour({ type: "precision_generale", question: "Quel papier ?" }, { suite: false });
    assert.equal(tour.aCompleter, true);
    assert.equal(construireTour({ type: "inconnue" }, { suite: false }).aCompleter, false);
  });
});
