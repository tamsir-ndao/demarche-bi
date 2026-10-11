// Tests de l'appel au modèle avec une sortie structurée (schéma Zod). Faux `fetch`, aucune requête réseau.
// Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { ErreurIA } from "./client";
import type { ChatProvider } from "./config";
import { chatJson } from "./structured";

const principal: ChatProvider = { name: "principal", baseUrl: "https://principal.test/v1", apiKey: "cle-a", model: "modele-a" };
const secours: ChatProvider = { name: "secours", baseUrl: "https://secours.test/v1", apiKey: "cle-b", model: "modele-b" };

const SchemaTest = z.object({ ok: z.boolean(), mot: z.string() });

const completion = (contenu: string) => Response.json({ choices: [{ message: { content: contenu } }] });

function fauxFetch(reponses: Response[]) {
  const corps: Record<string, unknown>[] = [];
  const fetchFictif = async (_url: string | URL | Request, init?: RequestInit) => {
    corps.push(JSON.parse(String(init?.body)));
    const suivante = reponses.shift();
    if (!suivante) throw new Error("plus de réponse prévue");
    return suivante;
  };
  return { fetch: fetchFictif, corps };
}

const appel = {
  nom: "test",
  schema: SchemaTest,
  messages: [{ role: "user" as const, content: "Bonjour" }],
  maxTokens: 200,
};

describe("chatJson", () => {
  it("envoie le schéma de l'objet et renvoie l'objet validé", async () => {
    const { fetch, corps } = fauxFetch([completion('{"ok":true,"mot":"salut"}')]);
    const resultat = await chatJson(appel, { providers: [principal], fetch });

    assert.deepEqual(resultat, { ok: true, mot: "salut" });
    const requete = corps[0] as {
      max_completion_tokens: number;
      response_format: { type: string; json_schema: { name: string; strict: boolean; schema: Record<string, unknown> } };
    };
    assert.equal(requete.max_completion_tokens, 200);
    assert.equal(requete.response_format.type, "json_schema");
    assert.equal(requete.response_format.json_schema.name, "test");
    assert.equal(requete.response_format.json_schema.strict, true);
    const schema = requete.response_format.json_schema.schema;
    assert.equal("$schema" in schema, false);
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.required, ["ok", "mot"]);
  });

  it("passe au fournisseur suivant quand la réponse n'est pas conforme au schéma", async () => {
    const { fetch } = fauxFetch([completion("ceci n'est pas du JSON"), completion('{"ok":true}'), completion('{"ok":false,"mot":"bon"}')]);
    const resultat = await chatJson(appel, { providers: [principal, secours, secours], fetch });
    assert.deepEqual(resultat, { ok: false, mot: "bon" });
  });

  it("échoue quand aucune réponse n'est conforme", async () => {
    const { fetch } = fauxFetch([completion("{}"), completion('{"ok":"oui","mot":1}')]);
    await assert.rejects(
      chatJson(appel, { providers: [principal, secours], fetch }),
      (erreur: unknown) => erreur instanceof ErreurIA && erreur.nature === "indisponible",
    );
  });
});
