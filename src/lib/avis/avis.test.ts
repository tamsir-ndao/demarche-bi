// Tests de la lecture d'un avis (le corps de POST /api/feedback). Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LONGUEUR_MAX_COMMENTAIRE } from "../texte";
import { lireAvis } from "./avis";

const IDENTIFIANT = "3f2a9c1e-5b7d-4e8a-9c3b-1a2b3c4d5e6f";

describe("lireAvis", () => {
  it("accepte un avis sans commentaire", () => {
    assert.deepEqual(lireAvis({ journalId: IDENTIFIANT, utile: true }), {
      ok: true,
      avis: { journalId: IDENTIFIANT, utile: true, commentaire: null },
    });
  });

  it("garde le commentaire, mis sur une ligne et sans espaces autour", () => {
    const lu = lireAvis({ journalId: IDENTIFIANT, utile: false, commentaire: "  Il manque\nle prix \t du timbre  " });
    assert.deepEqual(lu, { ok: true, avis: { journalId: IDENTIFIANT, utile: false, commentaire: "Il manque le prix du timbre" } });
  });

  it("traite un commentaire vide, blanc ou nul comme « pas de commentaire »", () => {
    for (const commentaire of ["", "   \n ", null]) {
      const lu = lireAvis({ journalId: IDENTIFIANT, utile: false, commentaire });
      assert.deepEqual(lu, { ok: true, avis: { journalId: IDENTIFIANT, utile: false, commentaire: null } });
    }
  });

  it("coupe le commentaire à la limite de la base sans casser un emoji", () => {
    const long = "é".repeat(LONGUEUR_MAX_COMMENTAIRE - 1) + "👍👍👍";
    const lu = lireAvis({ journalId: IDENTIFIANT, utile: false, commentaire: long });
    assert.ok(lu.ok);
    assert.equal(Array.from(lu.avis.commentaire ?? "").length, LONGUEUR_MAX_COMMENTAIRE);
    assert.equal(lu.avis.commentaire?.endsWith("é👍"), true);
  });

  it("ne garde pas les espaces qui terminent un commentaire coupé", () => {
    const lu = lireAvis({ journalId: IDENTIFIANT, utile: false, commentaire: `${"a".repeat(LONGUEUR_MAX_COMMENTAIRE - 1)} suite` });
    assert.ok(lu.ok);
    assert.equal(lu.avis.commentaire, "a".repeat(LONGUEUR_MAX_COMMENTAIRE - 1));
  });

  it("ne compte pas dans la limite les espaces du début", () => {
    const lu = lireAvis({ journalId: IDENTIFIANT, utile: false, commentaire: `   ${"a".repeat(LONGUEUR_MAX_COMMENTAIRE + 10)}` });
    assert.ok(lu.ok);
    assert.equal(lu.avis.commentaire, "a".repeat(LONGUEUR_MAX_COMMENTAIRE));
  });

  it("refuse ce qui n'est pas un objet", () => {
    for (const corps of [undefined, null, "oui", 12, true, [], [{ journalId: IDENTIFIANT, utile: true }]]) {
      assert.deepEqual(lireAvis(corps), { ok: false });
    }
  });

  it("refuse un identifiant qui n'est pas un UUID", () => {
    for (const journalId of [undefined, "", "abc", 7, null, `${IDENTIFIANT}x`, "3f2a9c1e5b7d4e8a9c3b1a2b3c4d5e6f"]) {
      assert.deepEqual(lireAvis({ journalId, utile: true }), { ok: false });
    }
  });

  it("refuse un « utile » qui n'est pas vrai ou faux", () => {
    for (const utile of [undefined, "true", 1, 0, null]) {
      assert.deepEqual(lireAvis({ journalId: IDENTIFIANT, utile }), { ok: false });
    }
  });

  it("refuse un commentaire qui n'est pas du texte", () => {
    for (const commentaire of [12, true, ["a"], {}]) {
      assert.deepEqual(lireAvis({ journalId: IDENTIFIANT, utile: false, commentaire }), { ok: false });
    }
  });

  it("ignore les champs en trop", () => {
    const lu = lireAvis({ journalId: IDENTIFIANT, utile: true, question: "ma carte", adresse: "1.2.3.4" });
    assert.deepEqual(lu, { ok: true, avis: { journalId: IDENTIFIANT, utile: true, commentaire: null } });
  });
});
