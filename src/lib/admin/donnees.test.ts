// Tests des chiffres du back-office, avec une fausse base. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Requete } from "../avis/journal";
import { agreger, completerLesJours, enCsv, lireTableau, pourcent, purgerEvenements } from "./donnees";

const T = Date.UTC(2026, 10, 1, 15);

describe("chiffres du back-office", () => {
  it("donne toujours 30 jours, aujourd'hui en dernier, un jour vide à zéro", () => {
    const jours = completerLesJours([{ jour: "2026-11-01", questions: 4 }], T);
    assert.equal(jours.length, 30);
    assert.deepEqual(jours.at(-1), { jour: "2026-11-01", questions: 4 });
    assert.deepEqual(jours[0], { jour: "2026-10-03", questions: 0 });
  });
  it("n'agrège que des jours terminés et encore complets", async () => {
    const appels: (readonly unknown[])[] = [];
    await agreger(async (_, valeurs) => void appels.push(valeurs), T);
    assert.deepEqual(appels[0], ["2026-08-04T00:00:00.000Z", "2026-11-01T00:00:00.000Z"]);
    assert.equal(appels.length, 2);
  });
  it("purge les passages de plus de 90 jours", async () => {
    let limite: unknown;
    await purgerEvenements(async (_, valeurs) => void (limite = valeurs[0]), T);
    assert.equal(limite, new Date(T - 90 * 86_400_000).toISOString());
  });
  it("base vide : des zéros, sans planter", async () => {
    const vide: Requete = async () => [];
    const tableau = await lireTableau(vide, T);
    assert.equal(tableau.trente, 0);
    assert.equal(tableau.premierJour, null);
    assert.equal(tableau.parJour.length, 30);
  });
  it("écrit un CSV sans texte libre", () => {
    assert.equal(
      enCsv([{ jour: "2026-11-01", questions: 3, repondues: 2, voix: 1, appareils: 2, esenegal: 1 }]),
      "jour,questions,repondues,voix,appareils,clics_esenegal\n2026-11-01,3,2,1,2,1\n",
    );
  });
  it("calcule une part sans diviser par zéro", () => {
    assert.equal(pourcent(1, 3), 33);
    assert.equal(pourcent(0, 0), 0);
  });
});
