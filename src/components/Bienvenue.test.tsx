// Rendu serveur de la présentation « Bienvenue » : rien sur le serveur (la décision se prend dans le navigateur), et
// un palier seul se rend avec son titre, son texte, son icône et sa place. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PALIERS } from "@/lib/bienvenue";
import { Bienvenue, PalierBienvenue } from "./Bienvenue";

describe("Bienvenue (rendu serveur)", () => {
  it("ne rend rien : la fenêtre ne s'ouvre que dans le navigateur, après décision", () => {
    assert.equal(renderToStaticMarkup(<Bienvenue />), "");
  });
});

describe("PalierBienvenue (rendu serveur)", () => {
  const html = renderToStaticMarkup(<PalierBienvenue palier={PALIERS[1]} numero={2} total={3} />);

  it("affiche le titre (focalisable, sans cadre), le texte et l'icône", () => {
    assert.match(html, /<h2 id="titre-bienvenue" tabindex="-1" data-titre-voix=""[^>]*>Une réponse avec ses sources<\/h2>/);
    assert.match(html, /Pièces, coût, délai, lieu/);
    assert.match(html, /<span aria-hidden="true" class="[^"]*bg-tint text-leaf"><svg [^>]*aria-hidden="true"/);
  });

  it("dit où l'on est : « Palier 2 sur 3 », avec trois points dont le deuxième est allumé", () => {
    assert.match(html, /role="group" aria-label="Palier 2 sur 3"/);
    const points = html.match(/<span aria-hidden="true" class="[^"]*rounded-full bg-(brand|tint-2)"><\/span>/g) ?? [];
    assert.equal(points.length, 3);
    assert.match(points[1], /bg-brand/);
    assert.match(points[0], /bg-tint-2/);
    assert.match(points[2], /bg-tint-2/);
  });

  it("place ce qu'on lui donne à droite des points", () => {
    const avecBouton = renderToStaticMarkup(
      <PalierBienvenue palier={PALIERS[0]} numero={1} total={3} aDroite={<button type="button">Passer</button>} />,
    );
    assert.match(avecBouton, /aria-label="Palier 1 sur 3"[\s\S]*<button type="button">Passer<\/button>/);
    assert.doesNotMatch(html, /Passer/);
  });
});
