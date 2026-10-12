// Tests des messages d'erreur de la voix. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CODES_ERREUR_VOIX, type CodeErreurVoix } from "./codes";
import { erreurDeVoix } from "./messages";

describe("erreurDeVoix", () => {
  it("a un message court, au tutoiement et sans jargon pour chaque erreur possible", () => {
    for (const code of CODES_ERREUR_VOIX) {
      const { message } = erreurDeVoix(code);
      assert.ok(message.length > 20 && message.length <= 110, `${code} : ${message.length} caractères`);
      assert.ok(message.endsWith("."), `${code} : phrase terminée par un point`);
      assert.ok(!/\b(vous|votre|vos|API|HTTP|serveur|erreur|code)\b/i.test(message), `${code} : ${message}`);
    }
  });

  it("dit à la personne quoi faire : écrire sa question quand la voix ne marchera pas, réessayer sinon", () => {
    const sansEspoir: CodeErreurVoix[] = ["voix_indisponible", "micro_introuvable", "format_non_pris_en_charge"];
    for (const code of CODES_ERREUR_VOIX) {
      assert.equal(erreurDeVoix(code).peutReessayer, !sansEspoir.includes(code), code);
    }
    assert.match(erreurDeVoix("voix_indisponible").message, /écris ta question/i);
    assert.match(erreurDeVoix("micro_refuse").message, /autorise/i);
    assert.match(erreurDeVoix("trop_de_demandes").message, /minute/i);
  });
});
