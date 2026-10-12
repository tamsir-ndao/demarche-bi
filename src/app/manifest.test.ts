// Tests du manifeste de l'application (ce qui la rend installable) et des icônes qu'il annonce. Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import manifest from "./manifest";

const RACINE = path.join(import.meta.dirname, "..", "..");

/** Largeur et hauteur d'un PNG, lues dans son en-tête. */
function tailleDuPng(chemin: string): { largeur: number; hauteur: number } {
  const octets = fs.readFileSync(chemin);
  assert.equal(octets.subarray(1, 4).toString("latin1"), "PNG", `${chemin} n'est pas un PNG`);
  return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) };
}

describe("manifest", () => {
  const { name, short_name, start_url, scope, display, lang, id, background_color, theme_color, icons = [] } = manifest();

  it("décrit une application qui s'ouvre en plein écran sur l'accueil, en français", () => {
    assert.equal(name, "Démarche-Bi");
    assert.equal(short_name, "Démarche-Bi");
    assert.equal(start_url, "/");
    assert.equal(scope, "/");
    assert.equal(id, "/");
    assert.equal(display, "standalone");
    assert.equal(lang, "fr");
  });

  it("reprend les couleurs du site clair pour l'écran de démarrage", () => {
    assert.equal(background_color, "#f4faf6");
    assert.equal(theme_color, "#f4faf6");
  });

  it("annonce les icônes que Chrome exige : 192 et 512 pixels, plus une icône qui s'adapte à la forme du téléphone", () => {
    const parTaille = (taille: string, but: string) => icons.filter((icone) => icone.sizes === taille && (icone.purpose ?? "any") === but);
    assert.equal(parTaille("192x192", "any").length, 1);
    assert.equal(parTaille("512x512", "any").length, 1);
    assert.equal(parTaille("512x512", "maskable").length, 1);
    for (const icone of icons) assert.equal(icone.type, "image/png");
  });

  it("pointe vers des fichiers qui existent, à la taille annoncée", () => {
    assert.ok(icons.length >= 3);
    for (const icone of icons) {
      const chemin = path.join(RACINE, "public", icone.src);
      assert.ok(fs.existsSync(chemin), `${icone.src} est introuvable dans public/`);
      const { largeur, hauteur } = tailleDuPng(chemin);
      assert.equal(`${largeur}x${hauteur}`, icone.sizes, icone.src);
    }
  });
});

describe("icônes du site", () => {
  it("a une icône pour l'écran d'accueil de l'iPhone de 180 sur 180 pixels", () => {
    assert.deepEqual(tailleDuPng(path.join(RACINE, "src", "app", "apple-icon.png")), { largeur: 180, hauteur: 180 });
  });

  it("a un favicon aux couleurs de Démarche-Bi (un vrai fichier .ico de plusieurs tailles)", () => {
    const octets = fs.readFileSync(path.join(RACINE, "src", "app", "favicon.ico"));
    assert.deepEqual([...octets.subarray(0, 4)], [0, 0, 1, 0], "en-tête d'un fichier .ico");
    assert.ok(octets.readUInt16LE(4) >= 2, "plusieurs tailles dans le fichier");
  });
});
