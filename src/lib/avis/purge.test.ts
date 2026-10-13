// Tests de la purge du journal : tout ce qui a plus de 90 jours part. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { autoriserLaPurge, creerPurge, DUREE_CONSERVATION_JOURS } from "./purge";

const MAINTENANT = Date.UTC(2026, 9, 12, 3, 0, 0);
const JOUR_MS = 24 * 60 * 60 * 1000;

type Appel = { texte: string; valeurs: readonly unknown[] };

/** Une base fausse : note chaque requête et répond « n lignes supprimées » dans l'ordre donné ; `Error` : la requête échoue. */
function baseFausse(...reponses: (number | Error)[]) {
  const appels: Appel[] = [];
  const requete = async (texte: string, valeurs: readonly unknown[]) => {
    appels.push({ texte, valeurs });
    const reponse = reponses.shift() ?? 0;
    if (reponse instanceof Error) throw reponse;
    return [{ n: reponse }];
  };
  return { appels, requete };
}

describe("creerPurge", () => {
  it("garde 90 jours", () => {
    assert.equal(DUREE_CONSERVATION_JOURS, 90);
  });

  it("supprime les avis puis les réponses de plus de 90 jours, avec la même date limite, et rend les comptes", async () => {
    const { appels, requete } = baseFausse(2, 7);
    const purge = creerPurge({ requete, maintenant: () => MAINTENANT });
    assert.deepEqual(await purge.purger(), { ok: true, reponses: 7, avis: 2 });

    const limite = new Date(MAINTENANT - 90 * JOUR_MS).toISOString();
    assert.equal(appels.length, 2);
    assert.match(appels[0].texte, /delete from feedback where created_at < \$1/);
    assert.match(appels[1].texte, /delete from question_logs where created_at < \$1/);
    assert.deepEqual(appels[0].valeurs, [limite]);
    assert.deepEqual(appels[1].valeurs, [limite]);
    assert.equal(limite, "2026-07-14T03:00:00.000Z");
  });

  it("ne supprime que ce qui est plus vieux que la limite : une ligne de 89 jours reste, une de 91 jours part", async () => {
    // La limite est un instant exact ; la base compare `created_at < limite`.
    const { appels, requete } = baseFausse();
    await creerPurge({ requete, maintenant: () => MAINTENANT }).purger();
    const limite = Date.parse(String(appels[0].valeurs[0]));
    assert.ok(MAINTENANT - 89 * JOUR_MS > limite, "89 jours : gardée");
    assert.ok(MAINTENANT - 91 * JOUR_MS < limite, "91 jours : supprimée");
  });

  it("rend zéro quand rien n'est supprimé, ou quand la base ne rend pas de compte lisible", async () => {
    const vide = creerPurge({ requete: async () => [], maintenant: () => MAINTENANT });
    assert.deepEqual(await vide.purger(), { ok: true, reponses: 0, avis: 0 });
    const bizarre = creerPurge({ requete: async () => [{ n: "beaucoup" }], maintenant: () => MAINTENANT });
    assert.deepEqual(await bizarre.purger(), { ok: true, reponses: 0, avis: 0 });
  });

  it("ne lève jamais d'erreur : une panne donne { ok: false } et s'arrête avant la suite", async () => {
    const { appels, requete } = baseFausse(new Error("la base est en panne"), 3);
    const signalements: string[] = [];
    const purge = creerPurge({ requete, maintenant: () => MAINTENANT, signaler: (etape) => signalements.push(etape) });
    assert.deepEqual(await purge.purger(), { ok: false });
    assert.equal(appels.length, 1, "les réponses ne sont pas touchées après l'échec des avis");
    assert.deepEqual(signalements, ["avis"]);
  });

  it("signale aussi une panne sur les réponses", async () => {
    const { requete } = baseFausse(1, new Error("panne"));
    const signalements: string[] = [];
    const purge = creerPurge({ requete, maintenant: () => MAINTENANT, signaler: (etape) => signalements.push(etape) });
    assert.deepEqual(await purge.purger(), { ok: false });
    assert.deepEqual(signalements, ["reponses"]);
  });

  it("marche sans fonction de signalement", async () => {
    const { requete } = baseFausse(new Error("panne"));
    assert.deepEqual(await creerPurge({ requete }).purger(), { ok: false });
  });
});

describe("autoriserLaPurge", () => {
  it("accepte l'en-tête « Bearer » avec le bon secret", () => {
    assert.equal(autoriserLaPurge("Bearer s3cret-valeur", "s3cret-valeur"), true);
  });
  it("refuse sans en-tête, avec un mauvais secret ou un autre schéma", () => {
    assert.equal(autoriserLaPurge(null, "s3cret"), false);
    assert.equal(autoriserLaPurge("", "s3cret"), false);
    assert.equal(autoriserLaPurge("Bearer autre", "s3cret"), false);
    assert.equal(autoriserLaPurge("Bearer s3cret-et-plus", "s3cret"), false);
    assert.equal(autoriserLaPurge("Basic s3cret", "s3cret"), false);
    assert.equal(autoriserLaPurge("s3cret", "s3cret"), false);
  });
  it("refuse toujours quand aucun secret n'est réglé, même avec un en-tête qui y ressemble", () => {
    assert.equal(autoriserLaPurge("Bearer ", undefined), false);
    assert.equal(autoriserLaPurge("Bearer undefined", undefined), false);
    assert.equal(autoriserLaPurge("Bearer ", ""), false);
    assert.equal(autoriserLaPurge("Bearer", ""), false);
    assert.equal(autoriserLaPurge(null, undefined), false);
  });
});
