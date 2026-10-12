// Tests du service de transcription (la route /api/transcribe), avec de vraies requêtes et un faux Whisper :
// aucune requête réseau. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TAILLE_MAX_AUDIO_OCTETS } from "../voix/audio";
import { ErreurIA } from "./client";
import { creerServiceTranscription } from "./transcription";

type AppelWhisper = { taille: number; type: string; nomFichier: string };

/** Faux Whisper : rend les textes (ou lève les erreurs) dans l'ordre et note ce qu'il a reçu. */
function fauxWhisper(reponses: (string | Error)[]) {
  const appels: AppelWhisper[] = [];
  const transcrire = async (audio: Blob, options: { nomFichier: string }) => {
    appels.push({ taille: audio.size, type: audio.type, nomFichier: options.nomFichier });
    const suivante = reponses.shift();
    if (suivante === undefined) throw new Error("plus de réponse prévue");
    if (suivante instanceof Error) throw suivante;
    return suivante;
  };
  return { transcrire, appels };
}

function limiteur(permis: boolean) {
  const visiteurs: string[] = [];
  return {
    autoriser(visiteur: string) {
      visiteurs.push(visiteur);
      return permis;
    },
    visiteurs,
  };
}

function formulaire(octets = 1000, type = "audio/webm;codecs=opus") {
  const donnees = new FormData();
  donnees.append("audio", new File([new Uint8Array(octets)], "enregistrement", { type }));
  return donnees;
}

const demande = (corps: BodyInit, entetes: Record<string, string> = {}) =>
  new Request("http://site.test/api/transcribe", { method: "POST", body: corps, headers: entetes });

const visiteur = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };

function service(reponses: (string | Error)[], permis = true) {
  const whisper = fauxWhisper(reponses);
  const limite = limiteur(permis);
  const signalees: unknown[] = [];
  const instance = creerServiceTranscription({
    transcrire: whisper.transcrire,
    limiteur: limite,
    signaler: (erreur) => signalees.push(erreur),
  });
  return { traiter: instance.traiter, whisper, limite, signalees };
}

describe("creerServiceTranscription", () => {
  it("rend le texte transcrit et envoie l'audio à Whisper avec le bon nom de fichier", async () => {
    const { traiter, whisper } = service(["Comment faire un passeport ?"]);
    const resultat = await traiter(demande(formulaire(1234, "audio/mp4")));

    assert.deepEqual(resultat, { ok: true, texte: "Comment faire un passeport ?" });
    assert.deepEqual(whisper.appels, [{ taille: 1234, type: "audio/mp4", nomFichier: "audio.mp4" }]);
  });

  it("met le texte sur une ligne et le coupe à la longueur d'une question", async () => {
    const { traiter } = service(["  Bonjour\n\n   comment ça va ?  ", "a".repeat(400)]);
    assert.deepEqual(await traiter(demande(formulaire())), { ok: true, texte: "Bonjour comment ça va ?" });
    const long = await traiter(demande(formulaire()));
    assert.ok(long.ok);
    assert.equal(long.texte.length, 300);
  });

  it("rend un texte vide quand Whisper n'entend rien", async () => {
    const { traiter } = service([""]);
    assert.deepEqual(await traiter(demande(formulaire())), { ok: true, texte: "" });
  });

  it("rend un texte vide quand Whisper invente une phrase sur du silence", async () => {
    const { traiter } = service(["Sous-titrage Société Radio-Canada", "Merci."]);
    assert.deepEqual(await traiter(demande(formulaire())), { ok: true, texte: "" });
    assert.deepEqual(await traiter(demande(formulaire())), { ok: true, texte: "" });
  });

  it("refuse une demande sans fichier audio, sans appeler Whisper", async () => {
    const { traiter, whisper } = service([]);
    const sansAudio = new FormData();
    sansAudio.append("autre", "valeur");
    assert.deepEqual(await traiter(demande(sansAudio)), { ok: false, code: "audio_manquant", statut: 400 });
    assert.equal(whisper.appels.length, 0);
  });

  it("refuse une demande qui n'est pas un formulaire", async () => {
    const { traiter, whisper } = service([]);
    const resultat = await traiter(demande('{"audio":"x"}', { "content-type": "application/json" }));
    assert.deepEqual(resultat, { ok: false, code: "audio_manquant", statut: 400 });
    assert.equal(whisper.appels.length, 0);
  });

  it("refuse un fichier vide, trop gros ou d'un format inconnu", async () => {
    const { traiter, whisper } = service([]);
    assert.deepEqual(await traiter(demande(formulaire(0))), { ok: false, code: "audio_vide", statut: 400 });
    assert.deepEqual(await traiter(demande(formulaire(TAILLE_MAX_AUDIO_OCTETS + 1))), {
      ok: false,
      code: "audio_trop_gros",
      statut: 413,
    });
    assert.deepEqual(await traiter(demande(formulaire(1000, "text/plain"))), {
      ok: false,
      code: "format_non_pris_en_charge",
      statut: 415,
    });
    assert.equal(whisper.appels.length, 0);
  });

  it("refuse sans la lire une demande qui annonce un contenu énorme", async () => {
    const { traiter, whisper } = service(["ne doit pas servir"]);
    // Le corps est petit et valide : seule l'annonce de taille (en-tête) peut expliquer le refus.
    const resultat = await traiter(demande(formulaire(), { "content-length": String(50 * 1024 * 1024) }));
    assert.deepEqual(resultat, { ok: false, code: "audio_trop_gros", statut: 413 });
    assert.equal(whisper.appels.length, 0);
  });

  it("limite le nombre d'enregistrements par visiteur (le premier de x-forwarded-for)", async () => {
    const { traiter, whisper, limite } = service(["ne doit pas servir"], false);
    const resultat = await traiter(demande(formulaire(), visiteur));
    assert.deepEqual(resultat, { ok: false, code: "trop_de_demandes", statut: 429 });
    assert.deepEqual(limite.visiteurs, ["203.0.113.7"]);
    assert.equal(whisper.appels.length, 0);
  });

  it("ne compte pas dans la limite une demande refusée avant Whisper, ni un visiteur inconnu", async () => {
    const { traiter, limite } = service(["Bonjour"], false);
    await traiter(demande(formulaire(0), visiteur));
    await traiter(demande(new FormData(), visiteur));
    const sansAdresse = await traiter(demande(formulaire()));
    assert.deepEqual(limite.visiteurs, []);
    assert.deepEqual(sansAdresse, { ok: true, texte: "Bonjour" });
  });

  it("signale un service saturé et garde la trace de l'erreur", async () => {
    const saturee = new ErreurIA("saturée", "saturee", ["transcription : HTTP 429"]);
    const { traiter, signalees } = service([saturee]);
    assert.deepEqual(await traiter(demande(formulaire())), { ok: false, code: "service_sature", statut: 503 });
    assert.deepEqual(signalees, [saturee]);
  });

  it("signale un service indisponible, qu'il soit en panne, non configuré ou que l'erreur soit inattendue", async () => {
    const erreurs = [
      new ErreurIA("en panne", "indisponible", ["transcription : HTTP 500"]),
      new ErreurIA("pas de clé", "non_configuree"),
      new TypeError("inattendue"),
    ];
    for (const erreur of erreurs) {
      const { traiter, signalees } = service([erreur]);
      assert.deepEqual(await traiter(demande(formulaire())), { ok: false, code: "service_indisponible", statut: 503 });
      assert.deepEqual(signalees, [erreur]);
    }
  });
});
