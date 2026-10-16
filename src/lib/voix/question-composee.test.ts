// Tests de la question composée sur un écran de précision (question déjà posée + réponse dite). Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LONGUEUR_MAX_QUESTION } from "../texte";
import { composerLaQuestion } from "./question-composee";

describe("composerLaQuestion", () => {
  it("sans préfixe (accueil), rend ce qui a été dit tel quel", () => {
    assert.equal(composerLaQuestion(undefined, "Je veux une pièce d'identité"), "Je veux une pièce d'identité");
    assert.equal(composerLaQuestion("", "La première"), "La première");
    assert.equal(composerLaQuestion("   ", "La première"), "La première");
  });

  it("termine le préfixe par un point quand il n'a pas de ponctuation", () => {
    assert.equal(
      composerLaQuestion("Je veux une pièce d'identité", "La première"),
      "Je veux une pièce d'identité. La première",
    );
  });

  it("garde la ponctuation d'un préfixe qui en a déjà une", () => {
    assert.equal(composerLaQuestion("Combien coûte le passeport ?", "Pour un adulte"), "Combien coûte le passeport ? Pour un adulte");
    assert.equal(composerLaQuestion("Je veux un extrait.", "De naissance"), "Je veux un extrait. De naissance");
    assert.equal(composerLaQuestion("Vite !", "Le permis"), "Vite ! Le permis");
  });

  it("normalise les espaces du préfixe et de la réponse", () => {
    assert.equal(
      composerLaQuestion("  Je veux   une pièce\nd'identité  ", "\n la   première "),
      "Je veux une pièce d'identité. la première",
    );
  });

  it("ne change pas la réponse (ni sa casse, ni son contenu)", () => {
    assert.equal(composerLaQuestion("Je veux une carte", "je veux une carte d'identité neuve"), "Je veux une carte. je veux une carte d'identité neuve");
  });

  it("tient dans la longueur maximale en raccourcissant le préfixe par la fin, jamais la réponse", () => {
    const prefixe = "Je veux savoir comment faire pour obtenir ma carte ".repeat(8);
    const dit = "La première, je n'en ai jamais eu";
    const resultat = composerLaQuestion(prefixe, dit);
    assert.ok(Array.from(resultat).length <= LONGUEUR_MAX_QUESTION, `${Array.from(resultat).length} caractères`);
    assert.ok(resultat.endsWith(` ${dit}`), resultat);
    assert.ok(resultat.includes("… "), resultat);
    assert.ok(resultat.startsWith("Je veux savoir comment faire"), resultat);
    // La coupe tombe sur un espace : pas de mot tronqué juste avant les points.
    assert.match(resultat, /\b(?:Je|veux|savoir|comment|faire|pour|obtenir|ma|carte)… /);
  });

  it("remplit la longueur maximale au plus juste (pas de coupe inutile)", () => {
    const dit = "Oui";
    const prefixe = "a".repeat(LONGUEUR_MAX_QUESTION - dit.length - 2); // + « . » + espace = pile la limite
    const resultat = composerLaQuestion(prefixe, dit);
    assert.equal(resultat.length, LONGUEUR_MAX_QUESTION);
    assert.ok(!resultat.includes("…"));
  });

  it("laisse la réponse seule quand elle prend presque toute la place, et la coupe seulement si elle dépasse à elle seule", () => {
    const longue = "mot ".repeat(80).trim(); // 319 caractères
    assert.equal(composerLaQuestion("Je veux une carte", longue), Array.from(longue).slice(0, LONGUEUR_MAX_QUESTION).join(""));
    const presque = "x".repeat(LONGUEUR_MAX_QUESTION - 2);
    assert.equal(composerLaQuestion("Je veux une carte", presque), presque);
  });

  it("compte les emojis comme un seul caractère", () => {
    const dit = "😀".repeat(10);
    const prefixe = "b".repeat(LONGUEUR_MAX_QUESTION - 12); // + « . » + espace + 10 emojis = pile la limite
    const resultat = composerLaQuestion(prefixe, dit);
    assert.equal(Array.from(resultat).length, LONGUEUR_MAX_QUESTION);
    assert.ok(resultat.endsWith(dit));
  });
});
