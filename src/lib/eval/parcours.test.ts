// Tests de la boucle avec pause. Aucune attente réelle : `dormir` est une doublure qui note la durée demandée.
// Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parcourirAvecPause } from "./parcours";

describe("parcourirAvecPause", () => {
  it("rend les résultats dans l'ordre des éléments et donne l'index à chaque appel", async () => {
    const vus: [string, number][] = [];
    const resultats = await parcourirAvecPause(["a", "b", "c"], async (item, index) => {
      vus.push([item, index]);
      return item.toUpperCase();
    });

    assert.deepEqual(resultats, ["A", "B", "C"]);
    assert.deepEqual(vus, [
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("ne fait rien, et ne dort pas, pour une liste vide", async () => {
    let appels = 0;
    const resultats = await parcourirAvecPause(
      [],
      async () => {
        appels += 1;
      },
      {
        pauseMs: 500,
        dormir: async () => {
          appels += 1;
        },
      },
    );

    assert.deepEqual(resultats, []);
    assert.equal(appels, 0);
  });

  it("fait une pause entre deux éléments, jamais avant le premier ni après le dernier", async () => {
    const journal: string[] = [];
    await parcourirAvecPause(
      ["a", "b", "c"],
      async (item) => {
        journal.push(`pose ${item}`);
      },
      {
        pauseMs: 250,
        dormir: async (ms) => {
          journal.push(`dort ${ms}`);
        },
      },
    );

    assert.deepEqual(journal, ["pose a", "dort 250", "pose b", "dort 250", "pose c"]);
  });

  it("ne dort pas sans pause demandée, ou avec une pause nulle ou négative", async () => {
    for (const pauseMs of [undefined, 0, -100]) {
      let dormi = 0;
      await parcourirAvecPause([1, 2, 3], async () => undefined, {
        pauseMs,
        dormir: async () => {
          dormi += 1;
        },
      });
      assert.equal(dormi, 0, `pauseMs : ${String(pauseMs)}`);
    }
  });

  it("ne pose jamais deux éléments en même temps", async () => {
    let enCours = 0;
    let maximum = 0;
    await parcourirAvecPause([1, 2, 3, 4], async () => {
      enCours += 1;
      maximum = Math.max(maximum, enCours);
      await new Promise<void>((resolve) => setImmediate(resolve));
      enCours -= 1;
    });

    assert.equal(maximum, 1);
  });

  it("signale chaque résultat dès qu'il est prêt, avant la pause suivante", async () => {
    const journal: string[] = [];
    await parcourirAvecPause(
      [10, 20],
      async (valeur) => valeur * 2,
      {
        pauseMs: 1,
        dormir: async () => {
          journal.push("dort");
        },
        surResultat: (resultat, index) => {
          journal.push(`résultat ${index} : ${resultat}`);
        },
      },
    );

    assert.deepEqual(journal, ["résultat 0 : 20", "dort", "résultat 1 : 40"]);
  });

  it("s'arrête à la première erreur et la laisse remonter, après avoir signalé les résultats déjà prêts", async () => {
    const signales: number[] = [];
    const traites: number[] = [];

    await assert.rejects(
      parcourirAvecPause(
        [1, 2, 3],
        async (valeur) => {
          traites.push(valeur);
          if (valeur === 2) throw new Error("panne du modèle");
          return valeur;
        },
        { surResultat: (resultat) => signales.push(resultat) },
      ),
      /panne du modèle/,
    );

    assert.deepEqual(traites, [1, 2]);
    assert.deepEqual(signales, [1]);
  });

  it("attend vraiment, avec l'attente par défaut, sans bloquer le parcours", async () => {
    const resultats = await parcourirAvecPause([1, 2], async (valeur) => valeur, { pauseMs: 1 });
    assert.deepEqual(resultats, [1, 2]);
  });

  it("accepte une liste en lecture seule", async () => {
    const liste: readonly string[] = ["x", "y"];
    assert.deepEqual(await parcourirAvecPause(liste, async (item) => item), ["x", "y"]);
  });
});
