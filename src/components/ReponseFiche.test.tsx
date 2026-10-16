// Rendu serveur de l'écran de réponse (sans navigateur ni IA) : l'ordre des couches, les étapes repliées, les pièces
// visibles, les notes à confirmer, les faits abrégés et la phrase d'introduction. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ficheDeTest } from "@/lib/ai/fiche-de-test";
import { ReponseFiche } from "./ReponseFiche";

const DELAI_LONG = "Environ dix jours de test en général ; parfois jusqu’à trois semaines selon l’affluence du guichet de test";
const COUT_LONG = "Gratuit au premier dépôt de test ; un timbre de test est demandé pour chaque renouvellement anticipé de test";

const fiche = ficheDeTest({
  slug: "demarche-test",
  titre: "Démarche de test",
  pieces: ["Pièce de test A", "Pièce de test B"],
  etapes: ["Première étape de test", "Deuxième étape de test", "Troisième étape de test"],
  cout: COUT_LONG,
  delai: DELAI_LONG,
  lieu: "Guichet de test",
  corps: "- Horaires à confirmer au guichet de test.",
});

const autres = ["autre-un", "autre-deux", "autre-trois"].map((slug) => ficheDeTest({ slug, titre: `Autre ${slug}` }));

const STATUT = { type: "verifie", libelle: "Vérifié le 1 janvier 2026" } as const;

function rendre(surcharges: Partial<Parameters<typeof ReponseFiche>[0]> = {}) {
  return renderToStaticMarkup(
    <ReponseFiche fiche={fiche} statut={STATUT} autres={autres} intro="Voici la phrase de test." degrade={null} {...surcharges} />,
  );
}

/** Les groupes d'apparition dans l'ordre où ils apparaissent dans le HTML, sans doublon. */
function groupes(html: string): string[] {
  const vus: string[] = [];
  for (const [, groupe] of html.matchAll(/data-apparition="([^"]+)"/g)) {
    if (!vus.includes(groupe)) vus.push(groupe);
  }
  return vus;
}

describe("ReponseFiche (rendu serveur)", () => {
  const html = rendre();

  it("pose les 8 groupes d'apparition dans l'ordre", () => {
    assert.deepEqual(groupes(html), ["entete", "intro", "faits", "a-confirmer", "pieces", "etapes", "sources", "suite"]);
  });

  it("garde les repères vocaux", () => {
    for (const repere of ["titre", "intro", "cout", "delai", "lieu", "a-confirmer", "pieces", "etapes"]) {
      assert.match(html, new RegExp(`data-lecture="${repere}"`), repere);
    }
  });

  it("replie les étapes dans un <details> fermé dont le <summary> porte le repère et le nombre", () => {
    const details = html.match(/<details[^>]*>[\s\S]*?<\/details>/g) ?? [];
    const etapes = details.find((bloc) => bloc.includes('data-lecture="etapes"'));
    assert.ok(etapes, "un <details> pour les étapes");
    assert.doesNotMatch(etapes, /<details[^>]*\sopen/);
    assert.match(etapes, /<summary[^>]*data-lecture="etapes"[^>]*>[\s\S]*?Les étapes[\s\S]*?3 étapes, dans l’ordre[\s\S]*?<\/summary>/);
    assert.match(etapes, /Troisième étape de test/);
  });

  it("laisse les pièces visibles, hors de tout <details>, avec leur nombre", () => {
    const h2 = html.indexOf('data-lecture="pieces"');
    assert.ok(h2 >= 0);
    assert.match(html, /data-lecture="pieces"[^>]*>Ce qu’il faut apporter<span[^>]*>2 pièces<\/span><\/h2>/);
    const avant = html.slice(0, h2);
    assert.equal((avant.match(/<details/g) ?? []).length, (avant.match(/<\/details>/g) ?? []).length, "le h2 n'est pas dans un <details>");
    assert.match(html, /Pièce de test B/);
  });

  it("ne montre que 2 cartes « Voir aussi » sur 3", () => {
    assert.match(html, /href="\/demarches\/autre-un"/);
    assert.match(html, /href="\/demarches\/autre-deux"/);
    assert.doesNotMatch(html, /href="\/demarches\/autre-trois"/);
  });

  it("garde les trois boutons de suite dans le groupe « suite »", () => {
    const suite = html.slice(html.indexOf('data-apparition="suite"'));
    assert.match(suite, /Poser une autre question/);
    assert.match(suite, /Partager/);
    assert.match(suite, /href="\/demarches\/demarche-test"[^>]*>Voir tous les détails/);
  });

  it("coupe le délai long comme la voix, avec « … », et garde le coût long entier", () => {
    assert.match(html, /Environ dix jours de test en général …/);
    assert.doesNotMatch(html, /selon l’affluence du guichet de test/);
    assert.match(html, new RegExp(COUT_LONG));
  });

  it("affiche une seule note à confirmer en ligne, sans section repliée", () => {
    assert.match(html, /aria-label="À confirmer"/);
    assert.doesNotMatch(html, /points à vérifier/);
  });
});

describe("ReponseFiche : plusieurs notes, sans intro", () => {
  const ficheNotes = ficheDeTest({
    slug: "demarche-notes",
    titre: "Démarche avec notes",
    etapes: ["Seule étape de test"],
    corps: "- Horaires à confirmer.\n- Tarif à confirmer.\n- Lieu à confirmer.\n- Une note ordinaire.",
  });
  const html = renderToStaticMarkup(<ReponseFiche fiche={ficheNotes} statut={STATUT} autres={[]} intro={null} degrade={null} />);

  it("replie trois notes dans un <details> « 3 points à vérifier » dont le <summary> porte le repère", () => {
    assert.match(html, /<summary[^>]*data-lecture="a-confirmer"[^>]*>[\s\S]*?À confirmer[\s\S]*?3 points à vérifier avant de te déplacer/);
    assert.equal((html.match(/aria-label="À confirmer"/g) ?? []).length, 3);
    assert.doesNotMatch(html, /Une note ordinaire/);
  });

  it("montre le résumé de la fiche sans mention IA quand l'intro manque", () => {
    assert.match(html, /Résumé de test sans information administrative réelle\./);
    assert.doesNotMatch(html, /Phrase écrite par l’IA/);
  });

  it("omet les groupes absents (pas de pièces) et met le singulier", () => {
    assert.deepEqual(groupes(html), ["entete", "intro", "faits", "a-confirmer", "etapes", "sources", "suite"]);
    assert.match(html, /1 étape</);
    assert.doesNotMatch(html, /1 étapes|étapes, dans l’ordre/);
  });
});
