// Tests de la lecture d'une demande envoyée à POST /api/ask. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lireDemandeApi } from "./api";

describe("lireDemandeApi", () => {
  it("lit la question", () => {
    assert.deepEqual(lireDemandeApi({ question: "Combien coûte la carte ?" }), {
      ok: true,
      question: "Combien coûte la carte ?",
      ficheSlug: undefined,
    });
  });

  it("met la question sur une ligne et enlève les espaces autour", () => {
    const demande = lireDemandeApi({ question: "  Combien\n coûte   la carte ?  " });
    assert.deepEqual(demande, { ok: true, question: "Combien coûte la carte ?", ficheSlug: undefined });
  });

  it("coupe une question trop longue à la limite du champ de saisie", () => {
    const demande = lireDemandeApi({ question: "a".repeat(500) });
    assert.equal(demande.ok && demande.question.length, 300);
  });

  it("lit la démarche choisie", () => {
    const demande = lireDemandeApi({ question: "Combien ça coûte ?", fiche: "casier-judiciaire" });
    assert.deepEqual(demande, { ok: true, question: "Combien ça coûte ?", ficheSlug: "casier-judiciaire" });
  });

  it("ignore une démarche mal écrite ou qui n'est pas un texte", () => {
    for (const fiche of ["../etc/passwd", "Casier Judiciaire", "", 12, null, ["casier-judiciaire"]]) {
      const demande = lireDemandeApi({ question: "Combien ça coûte ?", fiche });
      assert.deepEqual(demande, { ok: true, question: "Combien ça coûte ?", ficheSlug: undefined });
    }
  });

  it("refuse ce qui n'est pas un objet", () => {
    for (const corps of [undefined, null, "Combien ça coûte ?", 12, ["Combien ça coûte ?"]]) {
      const demande = lireDemandeApi(corps);
      assert.equal(demande.ok, false);
      assert.match(demande.ok ? "" : demande.erreur, /objet JSON/);
    }
  });

  it("refuse une question absente ou qui n'est pas un texte", () => {
    for (const question of [undefined, null, 12, ["Combien ça coûte ?"], { texte: "Combien ça coûte ?" }]) {
      const demande = lireDemandeApi({ question });
      assert.equal(demande.ok, false);
      assert.match(demande.ok ? "" : demande.erreur, /question/);
    }
  });

  it("refuse une question vide ou faite d'espaces", () => {
    for (const question of ["", "   ", "\n\t"]) {
      const demande = lireDemandeApi({ question });
      assert.equal(demande.ok, false);
      assert.match(demande.ok ? "" : demande.erreur, /vide/);
    }
  });
});
