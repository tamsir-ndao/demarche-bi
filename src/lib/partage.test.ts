// Tests du partage d'une fiche : coupe du résumé, adresse absolue, lien WhatsApp. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lienWhatsApp, LONGUEUR_MAX_PARTAGE, texteDePartage } from "./partage";

const fiche = {
  slug: "duplicata-carte-nationale-identite",
  titre: "Duplicata de la carte nationale d’identité",
  resume: "Refaire sa carte d’identité perdue ou volée, avec une déclaration de perte.",
};

describe("texteDePartage", () => {
  it("donne le titre, le résumé entier s'il est court, et l'adresse complète de la fiche", () => {
    const partage = texteDePartage(fiche, "https://demarche-bi.vercel.app");
    assert.equal(partage.title, fiche.titre);
    assert.equal(partage.text, fiche.resume);
    assert.equal(partage.url, "https://demarche-bi.vercel.app/demarches/duplicata-carte-nationale-identite");
  });

  it("coupe un résumé long sur un espace, avec des points de suspension", () => {
    const resume = Array.from({ length: 40 }, (_, i) => `mot${i}`).join(" ");
    const { text } = texteDePartage({ ...fiche, resume }, "https://demarche-bi.vercel.app");
    assert.ok(text.endsWith("…"));
    assert.ok(text.length <= LONGUEUR_MAX_PARTAGE + 1);
    // On ne coupe jamais au milieu d'un mot : le texte sans le « … » est un début exact du résumé suivi d'un espace.
    const debut = text.slice(0, -1);
    assert.ok(resume.startsWith(`${debut} `));
  });

  it("ne garde pas d'espace ni de retour à la ligne autour du résumé", () => {
    const { text } = texteDePartage({ ...fiche, resume: "  Un résumé.\n" }, "https://demarche-bi.vercel.app");
    assert.equal(text, "Un résumé.");
  });

  it("accepte une origine qui finit par une barre", () => {
    const { url } = texteDePartage(fiche, "http://localhost:3000/");
    assert.equal(url, "http://localhost:3000/demarches/duplicata-carte-nationale-identite");
  });
});

describe("lienWhatsApp", () => {
  it("ouvre wa.me avec le texte puis l'adresse, encodés", () => {
    const lien = lienWhatsApp("Carte d’identité & passeport", "https://demarche-bi.vercel.app/demarches/cni");
    assert.ok(lien.startsWith("https://wa.me/?text="));
    assert.ok(!lien.includes("&p"), "le « & » du texte doit être encodé");
    assert.ok(!lien.includes(" "));
    const texte = decodeURIComponent(lien.slice("https://wa.me/?text=".length));
    assert.equal(texte, "Carte d’identité & passeport\nhttps://demarche-bi.vercel.app/demarches/cni");
  });
});
