// Rendu serveur des écrans de précision (sans navigateur ni IA) : le bouton « Répondre à voix haute », les choix et
// les enveloppes ChoixVocal sont là et ne cassent pas la page. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ficheDeTest } from "@/lib/ai/fiche-de-test";
import { Precision, PrecisionGenerale } from "./Precision";

const options = [
  ficheDeTest({ slug: "cni-premiere", titre: "Première carte d'identité", categorie: "identite" }),
  ficheDeTest({ slug: "cni-duplicata", titre: "Duplicata de carte d'identité", categorie: "identite" }),
];

describe("Precision (rendu serveur)", () => {
  const html = renderToStaticMarkup(
    <Precision question="Première carte ou duplicata ?" questionPosee="je veux une pièce d'identité" options={options} />,
  );

  it("affiche la question, le bouton Écouter et le micro compact « Répondre à voix haute »", () => {
    assert.match(html, /Première carte ou duplicata/);
    assert.match(html, /Écouter l’essentiel/);
    assert.match(html, /<button type="button" class="[^"]*border-\[1\.5px\][^"]*w-full[^"]*">.*?Répondre à voix haute<\/button>/);
    // Le grand rond de l'accueil n'est pas là.
    assert.doesNotMatch(html, /size-48/);
    assert.doesNotMatch(html, /Appuie et parle/);
  });

  it("propose chaque démarche, « Autre chose » et « Annuler », chacun dans une enveloppe vocale invisible", () => {
    assert.match(html, /Première carte d'identité|Première carte d&#x27;identité/);
    assert.match(html, /Duplicata de carte d/);
    assert.match(html, /Autre chose/);
    assert.match(html, /Annuler/);
    // 2 choix + « Autre chose » + « Annuler » = 4 enveloppes ; elles n'ajoutent ni rôle ni tabindex.
    assert.equal(html.match(/<span class="contents">/g)?.length, 4);
    assert.doesNotMatch(html, /tabindex/i);
    assert.doesNotMatch(html, /role="button"/);
  });

  it("garde les liens de choix vers la réponse avec la question posée", () => {
    assert.match(html, /href="\/reponse\?q=je(\+|%20)veux[^"]*&amp;(fiche|slug|demarche)=cni-premiere"|href="\/reponse\?[^"]*cni-premiere[^"]*"/);
    assert.match(html, /href="\/"/);
  });
});

describe("PrecisionGenerale (rendu serveur)", () => {
  const html = renderToStaticMarkup(<PrecisionGenerale question="Peux-tu préciser ?" questionPosee="une démarche" />);

  it("affiche le champ prérempli puis le micro compact sous le formulaire", () => {
    assert.match(html, /id="question-precise"/);
    assert.match(html, /value="une démarche"/);
    const champ = html.indexOf('id="question-precise"');
    const micro = html.indexOf("Répondre à voix haute");
    assert.ok(champ >= 0 && micro > champ, "le micro vient après le champ");
    assert.doesNotMatch(html, /size-48/);
  });

  it("garde le lien vers les démarches", () => {
    assert.match(html, /href="\/demarches"/);
  });
});
