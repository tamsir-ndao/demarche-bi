// Tests de l'envoi d'un avis à la route /api/feedback, avec un faux `fetch`. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { envoyerLAvis, messageDeLErreur, type CodeErreurEnvoiAvis } from "./envoi";

const IDENTIFIANT = "3f2a9c1e-5b7d-4e8a-9c3b-1a2b3c4d5e6f";

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

describe("envoyerLAvis", () => {
  it("poste l'avis en JSON et rend « ok » quand la route répond 204", async () => {
    const { fetch, appels } = fauxFetch(new Response(null, { status: 204 }));

    const resultat = await envoyerLAvis({ journalId: IDENTIFIANT, utile: false, commentaire: "Il manque le prix" }, { fetch });

    assert.deepEqual(resultat, { ok: true });
    assert.equal(appels.length, 1);
    assert.equal(appels[0].url, "/api/feedback");
    assert.equal(appels[0].init.method, "POST");
    assert.deepEqual(new Headers(appels[0].init.headers).get("content-type"), "application/json");
    assert.deepEqual(JSON.parse(String(appels[0].init.body)), { journalId: IDENTIFIANT, utile: false, commentaire: "Il manque le prix" });
  });

  it("envoie un avis sans commentaire avec un commentaire nul", async () => {
    const { fetch, appels } = fauxFetch(new Response(null, { status: 204 }));

    await envoyerLAvis({ journalId: IDENTIFIANT, utile: true, commentaire: null }, { fetch });

    assert.deepEqual(JSON.parse(String(appels[0].init.body)), { journalId: IDENTIFIANT, utile: true, commentaire: null });
  });

  it("reconnaît « trop de demandes » (429)", async () => {
    const { fetch } = fauxFetch(Response.json({ erreur: "trop_de_demandes" }, { status: 429 }));

    assert.deepEqual(await envoyerLAvis({ journalId: IDENTIFIANT, utile: true, commentaire: null }, { fetch }), {
      ok: false,
      code: "trop_de_demandes",
    });
  });

  it("dit « indisponible » pour toute autre erreur du serveur, même sans corps lisible", async () => {
    for (const reponse of [
      Response.json({ erreur: "indisponible" }, { status: 503 }),
      Response.json({ erreur: "avis_invalide" }, { status: 400 }),
      new Response("<html>oups</html>", { status: 502 }),
    ]) {
      const { fetch } = fauxFetch(reponse);
      assert.deepEqual(await envoyerLAvis({ journalId: IDENTIFIANT, utile: true, commentaire: null }, { fetch }), {
        ok: false,
        code: "indisponible",
      });
    }
  });

  it("dit « réseau » quand la requête n'est pas partie", async () => {
    const { fetch } = fauxFetch(new TypeError("Failed to fetch"));

    assert.deepEqual(await envoyerLAvis({ journalId: IDENTIFIANT, utile: true, commentaire: null }, { fetch }), {
      ok: false,
      code: "reseau",
    });
  });
});

describe("messageDeLErreur", () => {
  it("donne une phrase courte, au tutoiement, pour chaque cas", () => {
    const codes: CodeErreurEnvoiAvis[] = ["trop_de_demandes", "reseau", "indisponible"];
    const messages = codes.map(messageDeLErreur);
    assert.equal(new Set(messages).size, codes.length);
    for (const message of messages) {
      assert.match(message, /[.!]$/);
      assert.ok(message.length <= 80, message);
    }
  });
});
