// Tests de l'appel au modèle de chat et à la transcription, avec un faux `fetch` : aucune requête réseau. Lancer : npm test
// Les clés ci-dessous sont des valeurs FICTIVES de test.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chat, ErreurIA, transcribe } from "./client";
import type { ChatProvider, WhisperConfig } from "./config";

const principal: ChatProvider = {
  name: "principal",
  baseUrl: "https://principal.test/v1",
  apiKey: "cle-principale",
  model: "modele-a",
  reasoningEffort: "low",
};
const secours: ChatProvider = {
  name: "secours",
  baseUrl: "https://secours.test/v1",
  apiKey: "cle-secours",
  model: "modele-b",
};
const messages = [{ role: "user" as const, content: "Bonjour" }];

function completion(contenu: string | null, statut = 200): Response {
  return Response.json({ choices: [{ message: { content: contenu } }] }, { status: statut });
}
const erreurHttp = (statut: number) => Response.json({ error: { message: "détail du fournisseur" } }, { status: statut });

type Appel = { url: string; init: RequestInit };

/** Faux fetch : rend les réponses (ou lève les erreurs) dans l'ordre et note chaque appel. */
function fauxFetch(reponses: (Response | Error)[]) {
  const appels: Appel[] = [];
  const fetchFictif = async (url: string | URL | Request, init?: RequestInit) => {
    appels.push({ url: String(url), init: init ?? {} });
    const suivante = reponses.shift();
    if (suivante === undefined) throw new Error("plus de réponse prévue");
    if (suivante instanceof Error) throw suivante;
    return suivante;
  };
  return { fetch: fetchFictif, appels };
}

const corps = (appel: Appel) => JSON.parse(String(appel.init.body));

async function echec(promesse: Promise<unknown>): Promise<ErreurIA> {
  try {
    await promesse;
  } catch (erreur) {
    assert.ok(erreur instanceof ErreurIA, `ErreurIA attendue, reçu : ${String(erreur)}`);
    return erreur;
  }
  assert.fail("une erreur était attendue");
}

describe("chat", () => {
  it("renvoie le texte du premier fournisseur et envoie la requête attendue", async () => {
    const { fetch, appels } = fauxFetch([completion("Salut")]);
    const texte = await chat(messages, {}, { providers: [principal, secours], fetch });

    assert.equal(texte, "Salut");
    assert.equal(appels.length, 1);
    assert.equal(appels[0].url, "https://principal.test/v1/chat/completions");
    assert.equal((appels[0].init.headers as Record<string, string>).Authorization, "Bearer cle-principale");
    assert.deepEqual(corps(appels[0]), { model: "modele-a", messages, temperature: 0, reasoning_effort: "low" });
  });

  it("demande un schéma JSON strict et plafonne la réponse quand on le lui demande", async () => {
    const { fetch, appels } = fauxFetch([completion("{}")]);
    const schema = { type: "object", properties: {}, additionalProperties: false };
    await chat(messages, { schema: { nom: "reponse", schema }, maxTokens: 300 }, { providers: [principal], fetch });

    const requete = corps(appels[0]);
    assert.deepEqual(requete.response_format, { type: "json_schema", json_schema: { name: "reponse", strict: true, schema } });
    assert.equal(requete.max_completion_tokens, 300);
  });

  it("demande du JSON libre avec l'option json", async () => {
    const { fetch, appels } = fauxFetch([completion("{}")]);
    await chat(messages, { json: true }, { providers: [secours], fetch });
    assert.deepEqual(corps(appels[0]).response_format, { type: "json_object" });
    assert.equal("reasoning_effort" in corps(appels[0]), false);
  });

  it("passe au fournisseur suivant quand le premier est saturé (429)", async () => {
    const { fetch, appels } = fauxFetch([erreurHttp(429), completion("Depuis le secours")]);
    const texte = await chat(messages, {}, { providers: [principal, secours], fetch });
    assert.equal(texte, "Depuis le secours");
    assert.equal(corps(appels[1]).model, "modele-b");
  });

  it("passe au fournisseur suivant après une erreur serveur, une erreur réseau ou une réponse vide", async () => {
    for (const premiere of [erreurHttp(503), new Error("réseau coupé"), completion(null), completion("")]) {
      const { fetch } = fauxFetch([premiere, completion("ok")]);
      assert.equal(await chat(messages, {}, { providers: [principal, secours], fetch }), "ok");
    }
  });

  it("passe au fournisseur suivant quand la réponse est refusée par `accepter`", async () => {
    const { fetch } = fauxFetch([completion("pas du json"), completion('{"ok":true}')]);
    const texte = await chat(
      messages,
      { accepter: (t) => t.startsWith("{") },
      { providers: [principal, secours], fetch },
    );
    assert.equal(texte, '{"ok":true}');
  });

  it("signale un service saturé quand tous les fournisseurs répondent 429", async () => {
    const { fetch } = fauxFetch([erreurHttp(429), erreurHttp(429)]);
    const erreur = await echec(chat(messages, {}, { providers: [principal, secours], fetch }));
    assert.equal(erreur.nature, "saturee");
    assert.deepEqual(erreur.details, ["principal : HTTP 429", "secours : HTTP 429"]);
  });

  it("signale un service indisponible pour les autres échecs, même mêlés à un 429", async () => {
    const { fetch } = fauxFetch([erreurHttp(429), erreurHttp(500)]);
    const erreur = await echec(chat(messages, {}, { providers: [principal, secours], fetch }));
    assert.equal(erreur.nature, "indisponible");
  });

  it("signale un service indisponible quand les réponses sont toutes refusées", async () => {
    const { fetch } = fauxFetch([completion("a"), completion("b")]);
    const erreur = await echec(chat(messages, { accepter: () => false }, { providers: [principal, secours], fetch }));
    assert.equal(erreur.nature, "indisponible");
  });

  it("signale l'absence de fournisseur configuré", async () => {
    const { fetch, appels } = fauxFetch([]);
    const erreur = await echec(chat(messages, {}, { providers: [], fetch }));
    assert.equal(erreur.nature, "non_configuree");
    assert.equal(appels.length, 0);
  });

  it("abandonne un fournisseur qui ne répond pas dans le délai", async () => {
    const appels: string[] = [];
    const fetchLent = async (url: string | URL | Request, init?: RequestInit) => {
      appels.push(String(url));
      if (appels.length > 1) return completion("réponse du secours");
      return new Promise<Response>((_, rejeter) => {
        // Le minuteur d'AbortSignal.timeout ne garde pas le processus en vie : sans ce minuteur actif, la boucle
        // d'événements peut se vider avant l'annulation et le test est annulé (vu en CI avec Node 22).
        const gardien = setTimeout(() => undefined, 5_000);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(gardien);
          rejeter(init.signal?.reason);
        });
      });
    };
    const texte = await chat(messages, { timeoutMs: 20 }, { providers: [principal, secours], fetch: fetchLent });
    assert.equal(texte, "réponse du secours");
    assert.equal(appels.length, 2);
  });

  it("n'écrit jamais la clé API ni le détail du fournisseur dans l'erreur", async () => {
    const { fetch } = fauxFetch([erreurHttp(401), erreurHttp(401)]);
    const erreur = await echec(chat(messages, {}, { providers: [principal, secours], fetch }));
    const texte = `${erreur.message} ${erreur.details.join(" ")}`;
    assert.ok(!texte.includes("cle-principale") && !texte.includes("cle-secours"));
    assert.ok(!texte.includes("détail du fournisseur"));
  });
});

describe("transcribe", () => {
  const whisper: WhisperConfig = {
    baseUrl: "https://whisper.test/v1",
    apiKey: "cle-whisper",
    model: "modele-whisper",
  };
  const audio = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm" });
  const transcription = (texte?: string) => Response.json(texte === undefined ? {} : { text: texte });

  it("envoie le fichier, le modèle et le français à Whisper", async () => {
    const { fetch, appels } = fauxFetch([transcription("Bonjour")]);
    const texte = await transcribe(audio, { nomFichier: "voix.webm" }, { config: whisper, fetch });

    assert.equal(texte, "Bonjour");
    assert.equal(appels.length, 1);
    assert.equal(appels[0].url, "https://whisper.test/v1/audio/transcriptions");
    assert.equal(appels[0].init.method, "POST");
    assert.equal((appels[0].init.headers as Record<string, string>).Authorization, "Bearer cle-whisper");
    const formulaire = appels[0].init.body;
    assert.ok(formulaire instanceof FormData);
    const fichier = formulaire.get("file");
    assert.ok(fichier instanceof File);
    assert.equal(fichier.name, "voix.webm");
    assert.equal(fichier.size, 4);
    assert.equal(formulaire.get("model"), "modele-whisper");
    assert.equal(formulaire.get("language"), "fr");
  });

  it("nomme le fichier audio.webm quand rien d'autre n'est demandé", async () => {
    const { fetch, appels } = fauxFetch([transcription("Bonjour")]);
    await transcribe(audio, {}, { config: whisper, fetch });
    const fichier = (appels[0].init.body as FormData).get("file");
    assert.ok(fichier instanceof File);
    assert.equal(fichier.name, "audio.webm");
  });

  it("rend le texte sans les espaces autour", async () => {
    const { fetch } = fauxFetch([transcription("  Comment faire un passeport ?\n")]);
    assert.equal(await transcribe(audio, {}, { config: whisper, fetch }), "Comment faire un passeport ?");
  });

  it("rend un texte vide quand Whisper n'entend rien ou ne rend pas de texte", async () => {
    for (const reponse of [transcription(""), transcription("   "), transcription(), Response.json(null), Response.json({ text: 42 })]) {
      const { fetch } = fauxFetch([reponse]);
      assert.equal(await transcribe(audio, {}, { config: whisper, fetch }), "");
    }
  });

  it("signale l'absence de configuration sans appeler le réseau", async () => {
    const { fetch, appels } = fauxFetch([]);
    const erreur = await echec(transcribe(audio, {}, { config: null, fetch }));
    assert.equal(erreur.nature, "non_configuree");
    assert.equal(appels.length, 0);
  });

  it("signale un service saturé sur une erreur 429", async () => {
    const { fetch } = fauxFetch([erreurHttp(429)]);
    const erreur = await echec(transcribe(audio, {}, { config: whisper, fetch }));
    assert.equal(erreur.nature, "saturee");
    assert.deepEqual(erreur.details, ["transcription : HTTP 429"]);
  });

  it("signale un service indisponible pour les autres erreurs HTTP", async () => {
    for (const statut of [400, 401, 413, 500, 503]) {
      const { fetch } = fauxFetch([erreurHttp(statut)]);
      const erreur = await echec(transcribe(audio, {}, { config: whisper, fetch }));
      assert.equal(erreur.nature, "indisponible");
      assert.deepEqual(erreur.details, [`transcription : HTTP ${statut}`]);
    }
  });

  it("signale un service indisponible sur une erreur réseau", async () => {
    const { fetch } = fauxFetch([new Error("réseau coupé")]);
    const erreur = await echec(transcribe(audio, {}, { config: whisper, fetch }));
    assert.equal(erreur.nature, "indisponible");
    assert.deepEqual(erreur.details, ["transcription : erreur réseau"]);
  });

  it("signale un service indisponible quand la réponse est illisible", async () => {
    const { fetch } = fauxFetch([new Response("pas du json", { status: 200 })]);
    const erreur = await echec(transcribe(audio, {}, { config: whisper, fetch }));
    assert.equal(erreur.nature, "indisponible");
    assert.deepEqual(erreur.details, ["transcription : réponse illisible"]);
  });

  it("abandonne quand Whisper ne répond pas dans le délai", async () => {
    const fetchLent = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_, rejeter) => {
        // Même précaution que pour `chat` : le minuteur d'AbortSignal.timeout ne garde pas la boucle en vie.
        const gardien = setTimeout(() => undefined, 5_000);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(gardien);
          rejeter(init.signal?.reason);
        });
      });
    const erreur = await echec(transcribe(audio, { timeoutMs: 20 }, { config: whisper, fetch: fetchLent }));
    assert.equal(erreur.nature, "indisponible");
    assert.deepEqual(erreur.details, ["transcription : délai dépassé"]);
  });

  it("n'écrit jamais la clé API ni le détail du fournisseur dans l'erreur", async () => {
    const { fetch } = fauxFetch([erreurHttp(401)]);
    const erreur = await echec(transcribe(audio, {}, { config: whisper, fetch }));
    const texte = `${erreur.message} ${erreur.details.join(" ")}`;
    assert.ok(!texte.includes("cle-whisper"));
    assert.ok(!texte.includes("détail du fournisseur"));
  });
});
