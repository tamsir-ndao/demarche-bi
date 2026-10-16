// Tests du plan du site : les pages fixes, chaque fiche vérifiée, jamais un brouillon. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadFiches } from "../lib/fiches/load";
import { URL_SITE } from "../lib/liens";
import sitemap, { entreesDuSitemap } from "./sitemap";

const PAGES_FIXES = ["/", "/demarches", "/projet", "/a-propos"];

describe("sitemap", () => {
  const { fiches } = loadFiches();
  const verifiees = fiches.filter((fiche) => fiche.statut === "verifie");
  const entrees = sitemap();
  const urls = entrees.map((entree) => entree.url);

  it("liste les pages fixes puis une entrée par fiche vérifiée (21 au 16 oct. 2026)", () => {
    assert.ok(verifiees.length >= 21, `au moins 21 fiches vérifiées attendues, ${verifiees.length} lues`);
    assert.equal(entrees.length, PAGES_FIXES.length + verifiees.length);
    for (const chemin of PAGES_FIXES) assert.ok(urls.includes(`${URL_SITE}${chemin}`), chemin);
    for (const fiche of verifiees) assert.ok(urls.includes(`${URL_SITE}/demarches/${fiche.slug}`), fiche.slug);
  });

  it("n'inclut aucun brouillon, quel que soit l'environnement", () => {
    const brouillons = fiches.filter((fiche) => fiche.statut === "brouillon");
    for (const fiche of brouillons) assert.ok(!urls.includes(`${URL_SITE}/demarches/${fiche.slug}`), fiche.slug);

    const avecBrouillon = entreesDuSitemap([
      { slug: "fiche-verifiee", statut: "verifie", verifie_le: "2026-10-01" },
      { slug: "fiche-brouillon", statut: "brouillon", verifie_le: null },
    ]);
    assert.deepEqual(
      avecBrouillon.map((entree) => entree.url),
      [...PAGES_FIXES.map((chemin) => `${URL_SITE}${chemin}`), `${URL_SITE}/demarches/fiche-verifiee`],
    );
  });

  it("n'utilise que des adresses absolues, sans doublon, et ignore les pages privées", () => {
    assert.equal(new Set(urls).size, urls.length);
    for (const url of urls) {
      assert.ok(url.startsWith("https://demarche-bi.vercel.app/"), url);
      assert.ok(!/\/(api|reponse|hors-connexion)(\/|$)/.test(url), url);
    }
  });

  it("date chaque fiche de sa vérification, et ne date pas les pages fixes", () => {
    for (const fiche of verifiees) {
      const entree = entrees.find((candidate) => candidate.url === `${URL_SITE}/demarches/${fiche.slug}`);
      assert.equal(entree?.lastModified, fiche.verifie_le, fiche.slug);
    }
    for (const chemin of PAGES_FIXES) {
      const entree = entrees.find((candidate) => candidate.url === `${URL_SITE}${chemin}`);
      assert.equal(entree?.lastModified, undefined, chemin);
    }
  });
});
