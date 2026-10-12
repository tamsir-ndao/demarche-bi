// Tests de l'envoi de la voix à la route /api/transcribe, avec un faux `fetch`. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { envoyerLaVoix } from "./envoi";

const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" });

type Appel = { url: string; init: RequestInit };

function fauxFetch(reponse: Response | Error) {
  const appels: Appel[] = [];
  const fetchFictif = async (url: string | URL | Request, init?: RequestInit) => {
    appels.push({ url: String(url), init: init ?? {} });
    if (reponse instanceof Error) throw reponse;
    return reponse;
  };
  return { fetch: fetchFictif, appels };
}

describe("envoyerLaVoix", () => {
  it("poste l'enregistrement dans le champ « audio » et rend le texte", async () => {
    const { fetch, appels } = fauxFetch(Response.json({ texte: "Comment faire un passeport ?" }));
    const resultat = await envoyerLaVoix(audio, { fetch });

    assert.deepEqual(resultat, { ok: true, texte: "Comment faire un passeport ?" });
    assert.equal(appels.length, 1);
    assert.equal(appels[0].url, "/api/transcribe");
    assert.equal(appels[0].init.method, "POST");
    const formulaire = appels[0].init.body;
    assert.ok(formulaire instanceof FormData);
    const fichier = formulaire.get("audio");
    assert.ok(fichier instanceof File);
    assert.equal(fichier.size, 3);
    assert.equal(fichier.type, "audio/webm;codecs=opus");
  });

  it("rend un texte vide quand rien n'a été entendu", async () => {
    const { fetch } = fauxFetch(Response.json({ texte: "" }));
    assert.deepEqual(await envoyerLaVoix(audio, { fetch }), { ok: true, texte: "" });
  });

  it("rend le code d'erreur de la route", async () => {
    for (const [statut, code] of [
      [429, "trop_de_demandes"],
      [503, "service_sature"],
      [503, "service_indisponible"],
      [413, "audio_trop_gros"],
      [415, "format_non_pris_en_charge"],
    ] as const) {
      const { fetch } = fauxFetch(Response.json({ erreur: code }, { status: statut }));
      assert.deepEqual(await envoyerLaVoix(audio, { fetch }), { ok: false, code });
    }
  });

  it("traite comme un service indisponible une réponse qu'il ne comprend pas", async () => {
    const reponses = [
      Response.json({ erreur: "code_inconnu" }, { status: 500 }),
      new Response("<html>Bad gateway</html>", { status: 502 }),
      Response.json({ autre: true }),
      Response.json({ texte: 42 }),
      new Response("pas du json", { status: 200 }),
    ];
    for (const reponse of reponses) {
      const { fetch } = fauxFetch(reponse);
      assert.deepEqual(await envoyerLaVoix(audio, { fetch }), { ok: false, code: "service_indisponible" });
    }
  });

  it("signale un problème de réseau", async () => {
    const { fetch } = fauxFetch(new TypeError("Failed to fetch"));
    assert.deepEqual(await envoyerLaVoix(audio, { fetch }), { ok: false, code: "reseau" });
  });

  it("signale l'annulation, sans la prendre pour un problème de réseau", async () => {
    const { fetch } = fauxFetch(new DOMException("annulé", "AbortError"));
    assert.deepEqual(await envoyerLaVoix(audio, { fetch }), { ok: false, code: "annule" });
  });

  it("ignore la réponse d'un envoi annulé pendant qu'elle arrivait", async () => {
    const controleur = new AbortController();
    const fetchFictif = async () => {
      controleur.abort();
      return Response.json({ texte: "arrivé trop tard" });
    };
    assert.deepEqual(await envoyerLaVoix(audio, { fetch: fetchFictif, signal: controleur.signal }), { ok: false, code: "annule" });
  });

  it("transmet le signal d'annulation à fetch", async () => {
    const controleur = new AbortController();
    const { fetch, appels } = fauxFetch(Response.json({ texte: "ok" }));
    await envoyerLaVoix(audio, { fetch, signal: controleur.signal });
    assert.equal(appels[0].init.signal, controleur.signal);
  });
});
