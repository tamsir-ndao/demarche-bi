// Tests de la lecture de l'enregistrement reçu. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extensionAudio, lireAudio, TAILLE_MAX_AUDIO_OCTETS } from "./audio";

const fichier = (octets: number, type: string) => new File([new Uint8Array(octets)], "enregistrement", { type });

describe("extensionAudio", () => {
  it("donne l'extension que Whisper reconnaît pour chaque format d'enregistrement des navigateurs", () => {
    assert.equal(extensionAudio("audio/webm"), "webm");
    assert.equal(extensionAudio("audio/ogg"), "ogg");
    assert.equal(extensionAudio("audio/mp4"), "mp4");
    assert.equal(extensionAudio("audio/x-m4a"), "m4a");
    assert.equal(extensionAudio("audio/mpeg"), "mp3");
    assert.equal(extensionAudio("audio/wav"), "wav");
    assert.equal(extensionAudio("audio/x-wav"), "wav");
    assert.equal(extensionAudio("audio/flac"), "flac");
  });

  it("ignore les paramètres et la casse", () => {
    assert.equal(extensionAudio("audio/webm;codecs=opus"), "webm");
    assert.equal(extensionAudio("Audio/WebM; codecs=opus"), "webm");
    assert.equal(extensionAudio("audio/mp4;codecs=mp4a.40.2"), "mp4");
  });

  it("ne connaît ni la vidéo, ni le texte, ni un type vide", () => {
    for (const type of ["video/webm", "text/plain", "application/octet-stream", "audio/midi", ""]) {
      assert.equal(extensionAudio(type), undefined, type);
    }
  });
});

describe("lireAudio", () => {
  it("accepte un enregistrement et choisit le nom de fichier d'après son format", () => {
    const audio = fichier(1000, "audio/webm;codecs=opus");
    const resultat = lireAudio(audio);
    assert.ok(resultat.ok);
    assert.equal(resultat.audio, audio);
    assert.equal(resultat.nomFichier, "audio.webm");
  });

  it("nomme le fichier d'après le format de Safari", () => {
    const resultat = lireAudio(fichier(1000, "audio/mp4"));
    assert.ok(resultat.ok);
    assert.equal(resultat.nomFichier, "audio.mp4");
  });

  it("accepte un fichier de la taille maximale", () => {
    assert.equal(lireAudio(fichier(TAILLE_MAX_AUDIO_OCTETS, "audio/webm")).ok, true);
  });

  it("refuse l'absence de fichier, et un champ qui est du texte", () => {
    for (const valeur of [null, undefined, "audio.webm"]) {
      assert.deepEqual(lireAudio(valeur), { ok: false, code: "audio_manquant" });
    }
  });

  it("refuse un fichier vide", () => {
    assert.deepEqual(lireAudio(fichier(0, "audio/webm")), { ok: false, code: "audio_vide" });
  });

  it("refuse un fichier plus gros que la taille maximale", () => {
    assert.deepEqual(lireAudio(fichier(TAILLE_MAX_AUDIO_OCTETS + 1, "audio/webm")), { ok: false, code: "audio_trop_gros" });
  });

  it("refuse un format que Whisper ne lit pas", () => {
    assert.deepEqual(lireAudio(fichier(1000, "text/plain")), { ok: false, code: "format_non_pris_en_charge" });
    assert.deepEqual(lireAudio(fichier(1000, "")), { ok: false, code: "format_non_pris_en_charge" });
  });
});
