// Tests des petits choix de l'enregistreur (le reste dépend du navigateur et se vérifie dans un vrai navigateur).
// Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choisirFormat, codeErreurMicro, voixDisponible } from "./enregistreur";

describe("choisirFormat", () => {
  it("préfère webm/opus, léger et lu par Whisper, puis ogg, puis mp4 (Safari)", () => {
    const tous = () => true;
    assert.equal(choisirFormat(tous), "audio/webm;codecs=opus");
    assert.equal(choisirFormat((type) => type === "audio/webm"), "audio/webm");
    assert.equal(choisirFormat((type) => type.startsWith("audio/ogg")), "audio/ogg;codecs=opus");
    assert.equal(choisirFormat((type) => type === "audio/mp4"), "audio/mp4");
  });

  it("laisse le navigateur choisir quand aucun format connu n'est pris en charge", () => {
    assert.equal(choisirFormat(() => false), undefined);
  });
});

describe("codeErreurMicro", () => {
  const erreur = (nom: string) => new DOMException("détail du navigateur", nom);

  it("reconnaît un micro refusé", () => {
    assert.equal(codeErreurMicro(erreur("NotAllowedError")), "micro_refuse");
    assert.equal(codeErreurMicro(erreur("SecurityError")), "micro_refuse");
  });

  it("reconnaît l'absence de micro", () => {
    assert.equal(codeErreurMicro(erreur("NotFoundError")), "micro_introuvable");
    assert.equal(codeErreurMicro(erreur("OverconstrainedError")), "micro_introuvable");
  });

  it("met le reste (micro déjà utilisé, panne, erreur inconnue) dans « micro inaccessible »", () => {
    assert.equal(codeErreurMicro(erreur("NotReadableError")), "micro_inaccessible");
    assert.equal(codeErreurMicro(erreur("AbortError")), "micro_inaccessible");
    assert.equal(codeErreurMicro(new Error("autre chose")), "micro_inaccessible");
    assert.equal(codeErreurMicro("pas une erreur"), "micro_inaccessible");
  });
});

describe("voixDisponible", () => {
  const getUserMedia = async () => undefined;

  it("demande un micro accessible et un enregistreur", () => {
    assert.equal(voixDisponible({ mediaDevices: { getUserMedia }, MediaRecorder: class {} }), true);
  });

  it("refuse quand le navigateur n'a pas de micro (page non sécurisée, vieux navigateur)", () => {
    assert.equal(voixDisponible({ mediaDevices: undefined, MediaRecorder: class {} }), false);
    assert.equal(voixDisponible({ mediaDevices: {}, MediaRecorder: class {} }), false);
  });

  it("refuse quand le navigateur ne sait pas enregistrer", () => {
    assert.equal(voixDisponible({ mediaDevices: { getUserMedia }, MediaRecorder: undefined }), false);
  });
});
