// Tests de la configuration des fournisseurs IA. Lancer : npm test
// Les clés ci-dessous sont des valeurs FICTIVES de test.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getChatProviders, MODELE_PRINCIPAL, MODELE_SECOURS, MODELE_TROISIEME } from "./config";

const GROQ = "https://api.groq.com/openai/v1";

describe("getChatProviders", () => {
  it("ne renvoie aucun fournisseur sans clé", () => {
    assert.deepEqual(getChatProviders({}), []);
    assert.deepEqual(getChatProviders({ AI_API_KEY: "" }), []);
  });

  it("utilise trois modèles de Groq avec la seule clé principale, chacun avec son propre quota", () => {
    const [principal, secours, troisieme, ...reste] = getChatProviders({ AI_API_KEY: "cle-test" });
    assert.deepEqual(principal, {
      name: "principal",
      baseUrl: GROQ,
      apiKey: "cle-test",
      model: MODELE_PRINCIPAL,
      reasoningEffort: "low",
    });
    assert.deepEqual(secours, {
      name: "secours",
      baseUrl: GROQ,
      apiKey: "cle-test",
      model: MODELE_SECOURS,
      reasoningEffort: "none",
    });
    assert.deepEqual(troisieme, {
      name: "troisieme",
      baseUrl: GROQ,
      apiKey: "cle-test",
      model: MODELE_TROISIEME,
      reasoningEffort: "low",
    });
    assert.deepEqual(reste, []);
  });

  it("met le plus petit modèle en dernier", () => {
    assert.deepEqual(
      getChatProviders({ AI_API_KEY: "cle-test" }).map((p) => p.model),
      ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"],
    );
  });

  it("n'ajoute pas le troisième modèle quand il est déjà le principal ou le secours", () => {
    const parNom = (env: Record<string, string>) => getChatProviders({ AI_API_KEY: "cle-test", ...env }).map((p) => p.model);
    assert.deepEqual(parNom({ AI_MODEL: MODELE_TROISIEME }), [MODELE_TROISIEME, MODELE_SECOURS]);
    assert.deepEqual(parNom({ AI_FALLBACK_MODEL: MODELE_TROISIEME }), [MODELE_PRINCIPAL, MODELE_TROISIEME]);
  });

  it("traite les variables vides comme absentes", () => {
    const env = { AI_API_KEY: "cle-test", AI_MODEL: "", AI_BASE_URL: "", AI_FALLBACK_API_KEY: "", AI_FALLBACK_MODEL: "" };
    const modeles = getChatProviders(env).map((p) => p.model);
    assert.deepEqual(modeles, [MODELE_PRINCIPAL, MODELE_SECOURS, MODELE_TROISIEME]);
  });

  it("n'applique pas l'effort de raisonnement par défaut à un autre modèle principal", () => {
    const [principal, secours] = getChatProviders({ AI_API_KEY: "cle-test", AI_MODEL: "autre/modele" });
    assert.equal(principal.model, "autre/modele");
    assert.equal(principal.reasoningEffort, undefined);
    assert.equal(secours.reasoningEffort, "none");
  });

  it("applique AI_REASONING_EFFORT au modèle principal", () => {
    const [principal] = getChatProviders({ AI_API_KEY: "cle-test", AI_MODEL: "autre/modele", AI_REASONING_EFFORT: "medium" });
    assert.equal(principal.reasoningEffort, "medium");
  });

  it("change le modèle de secours avec AI_FALLBACK_MODEL, sur le même fournisseur", () => {
    const [, secours] = getChatProviders({ AI_API_KEY: "cle-test", AI_FALLBACK_MODEL: "autre/secours" });
    assert.equal(secours.model, "autre/secours");
    assert.equal(secours.baseUrl, GROQ);
    assert.equal(secours.apiKey, "cle-test");
    assert.equal(secours.reasoningEffort, undefined);
  });

  it("n'ajoute pas le troisième modèle de Groq derrière un fournisseur de secours explicite", () => {
    const noms = getChatProviders({ AI_API_KEY: "cle-test", AI_FALLBACK_API_KEY: "cle-secours", AI_FALLBACK_MODEL: "ecole/modele" }).map((p) => p.name);
    assert.deepEqual(noms, ["principal", "secours"]);
  });

  it("n'ajoute pas de secours tout seul quand le fournisseur principal n'est pas Groq", () => {
    const fournisseurs = getChatProviders({ AI_API_KEY: "cle-test", AI_BASE_URL: "https://exemple.test/v1" });
    assert.deepEqual(
      fournisseurs.map((p) => p.name),
      ["principal"],
    );
    assert.equal(fournisseurs[0].baseUrl, "https://exemple.test/v1");
  });

  it("utilise un fournisseur de secours explicite, avec sa propre clé", () => {
    const fournisseurs = getChatProviders({
      AI_API_KEY: "cle-test",
      AI_FALLBACK_API_KEY: "cle-secours",
      AI_FALLBACK_MODEL: "ecole/modele:free",
    });
    assert.deepEqual(fournisseurs[1], {
      name: "secours",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "cle-secours",
      model: "ecole/modele:free",
      reasoningEffort: undefined,
    });
  });

  it("accepte l'adresse d'un fournisseur de secours explicite", () => {
    const [, secours] = getChatProviders({
      AI_API_KEY: "cle-test",
      AI_FALLBACK_API_KEY: "cle-secours",
      AI_FALLBACK_BASE_URL: "https://autre.test/v1",
      AI_FALLBACK_MODEL: "ecole/modele",
    });
    assert.equal(secours.baseUrl, "https://autre.test/v1");
  });

  it("ignore un fournisseur de secours explicite sans modèle", () => {
    const fournisseurs = getChatProviders({ AI_API_KEY: "cle-test", AI_FALLBACK_API_KEY: "cle-secours" });
    assert.deepEqual(
      fournisseurs.map((p) => p.name),
      ["principal"],
    );
  });
});
