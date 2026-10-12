// Tests du repérage des phrases que Whisper invente sur du silence. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { texteDeSilence } from "./silence";

describe("texteDeSilence", () => {
  it("repère les crédits de sous-titres que Whisper invente sur du silence (mesurés le 11 octobre 2026)", () => {
    for (const texte of [
      "Sous-titrage Société Radio-Canada",
      "Sous-titrage ST' 501",
      "Sous-titres réalisés par la communauté d'Amara.org",
      "sous-titrage societe radio-canada",
      "  Sous-titrage   Société Radio-Canada \n",
    ]) {
      assert.equal(texteDeSilence(texte), true, texte);
    }
  });

  it("repère un simple remerciement ou au revoir, avec ou sans ponctuation", () => {
    for (const texte of [
      "Merci.",
      "Merci !",
      "merci",
      "Merci beaucoup.",
      "Merci à tous.",
      "Merci d'avoir regardé cette vidéo !",
      "Merci d’avoir regardé cette vidéo.",
      "À bientôt.",
    ]) {
      assert.equal(texteDeSilence(texte), true, texte);
    }
  });

  it("laisse passer une vraie question, même polie", () => {
    for (const texte of [
      "Comment faire un passeport ?",
      "Merci, comment faire un passeport ?",
      "Je veux savoir si je peux faire mon extrait de naissance à la mairie, merci.",
      "C'est combien le casier judiciaire ?",
    ]) {
      assert.equal(texteDeSilence(texte), false, texte);
    }
  });

  it("ne dit rien d'un texte vide (le texte vide est déjà « rien entendu »)", () => {
    assert.equal(texteDeSilence(""), false);
    assert.equal(texteDeSilence("   "), false);
  });
});
