// Tests de la recherche lexicale. Lancer : npm test
// Les fiches ci-dessous sont des données FICTIVES de test : elles ne contiennent aucun montant
// ni aucune information administrative réelle et ne doivent jamais aller dans content/.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Fiche } from "./schema";
import { normaliser, searchFiches } from "./search";

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

const passeport = fiche({
  slug: "passeport",
  titre: "Passeport biométrique",
  mots_cles: ["passeport", "voyage", "biometrique"],
});
const carteIdentite = fiche({
  slug: "carte-identite",
  titre: "Carte d'identité nationale",
  mots_cles: ["carte", "identite", "cni"],
});

describe("normaliser", () => {
  it("passe en minuscules et retire les accents", () => {
    assert.deepEqual(normaliser("PASSEPORT Biométrique"), ["passeport", "biometrique"]);
  });

  it("retire les mots vides, la ponctuation et les apostrophes", () => {
    assert.deepEqual(normaliser("Où refaire ma carte d'identité ?"), ["refaire", "carte", "identite"]);
  });

  it("rapproche le pluriel du singulier", () => {
    assert.deepEqual(normaliser("pièces"), normaliser("pièce"));
  });

  it("renvoie une liste vide pour une question sans mot utile", () => {
    assert.deepEqual(normaliser("  ?! le la de  "), []);
  });
});

describe("searchFiches", () => {
  it("trouve une fiche sans tenir compte des accents ni de la casse", () => {
    const resultats = searchFiches([passeport, carteIdentite], "BIOMÉTRIQUE", { seuil: 0 });
    assert.equal(resultats[0]?.fiche.slug, "passeport");
  });

  it("classe d'abord la fiche qui correspond à la question", () => {
    const resultats = searchFiches([passeport, carteIdentite], "refaire ma carte d'identité", {
      seuil: 0,
    });
    assert.deepEqual(
      resultats.map((r) => r.fiche.slug),
      ["carte-identite"],
    );
  });

  it("trie les résultats par score décroissant", () => {
    const a = fiche({ slug: "a", titre: "Démarche A", mots_cles: ["naissance", "acte", "mairie"] });
    const b = fiche({
      slug: "b",
      titre: "Démarche B",
      corps: "Une naissance est déclarée. La naissance doit être enregistrée.",
    });
    const resultats = searchFiches([b, a], "naissance", { seuil: 0 });
    assert.deepEqual(
      resultats.map((r) => r.fiche.slug),
      ["a", "b"],
    );
    assert.ok(resultats[0].score > resultats[1].score);
  });

  it("donne plus de poids au titre qu'au corps", () => {
    const dansLeTitre = fiche({ slug: "titre", titre: "Légalisation de documents" });
    const dansLeCorps = fiche({
      slug: "corps",
      titre: "Démarche sans rapport",
      corps: "Texte de test : légalisation, légalisation, légalisation.",
    });
    const resultats = searchFiches([dansLeCorps, dansLeTitre], "légalisation", { seuil: 0 });
    assert.equal(resultats[0].fiche.slug, "titre");
  });

  it("renvoie une liste vide pour une question hors périmètre", () => {
    assert.deepEqual(searchFiches([passeport, carteIdentite], "recette du thieboudienne"), []);
  });

  it("renvoie une liste vide pour une question vide ou sans mot utile", () => {
    assert.deepEqual(searchFiches([passeport], ""), []);
    assert.deepEqual(searchFiches([passeport], "le la de ?"), []);
  });

  it("renvoie une liste vide quand il n'y a aucune fiche", () => {
    assert.deepEqual(searchFiches([], "passeport"), []);
  });

  it("retrouve avec le seuil par défaut une fiche clairement demandée", () => {
    const resultats = searchFiches([passeport, carteIdentite], "comment obtenir un passeport ?");
    assert.equal(resultats[0]?.fiche.slug, "passeport");
  });

  it("écarte les fiches sous le seuil demandé", () => {
    assert.deepEqual(searchFiches([passeport], "passeport", { seuil: 1000 }), []);
  });

  it("exclut les brouillons par défaut et les inclut sur demande", () => {
    const brouillon = fiche({ slug: "brouillon", titre: "Passeport en brouillon", statut: "brouillon", verifie_le: null, verifie_par: null });
    assert.deepEqual(searchFiches([brouillon], "passeport", { seuil: 0 }), []);
    const avecBrouillons = searchFiches([brouillon], "passeport", { seuil: 0, inclureBrouillons: true });
    assert.equal(avecBrouillons[0]?.fiche.slug, "brouillon");
  });

  it("limite le nombre de résultats (3 par défaut)", () => {
    const fiches = ["a", "b", "c", "d"].map((s) =>
      fiche({ slug: s, titre: `Permis ${s}`, mots_cles: ["permis", "conduire", "examen"] }),
    );
    assert.equal(searchFiches(fiches, "permis", { seuil: 0 }).length, 3);
    assert.equal(searchFiches(fiches, "permis", { seuil: 0, limite: 2 }).length, 2);
  });
});
