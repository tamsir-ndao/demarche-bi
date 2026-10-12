// Tests du surlignage : le bloc de l'écran que la voix est en train de lire. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { surligner, type ElementSurlignable, type Racine } from "./surlignage";

const HAUTEUR = 800;
const REGLAGES = { mouvementReduit: false, hauteurFenetre: HAUTEUR };

class FauxElement implements ElementSurlignable {
  attributs = new Map<string, string>();
  defilements: { behavior: string; block: string }[] = [];
  /** `undefined` : l'élément ne sait pas dire où il est. */
  constructor(
    public blocs: string,
    public position?: { top: number; bottom: number },
  ) {}
  setAttribute(nom: string, valeur: string) {
    this.attributs.set(nom, valeur);
  }
  removeAttribute(nom: string) {
    this.attributs.delete(nom);
  }
  scrollIntoView(options: { behavior: "auto" | "smooth"; block: "center" }) {
    this.defilements.push(options);
  }
  getBoundingClientRect() {
    return this.position ?? { top: 0, bottom: 0 };
  }
  get surligne() {
    return this.attributs.has("data-lu");
  }
}

/** Une page de faux éléments ; comprend le sélecteur `[data-lecture~="bloc"]` (un bloc parmi ceux de l'élément). */
function pageAvec(...elements: FauxElement[]): Racine & { selecteurs: string[] } {
  const selecteurs: string[] = [];
  return {
    selecteurs,
    querySelectorAll(selecteur: string) {
      selecteurs.push(selecteur);
      const bloc = /^\[data-lecture~="([^"]+)"\]$/.exec(selecteur)?.[1];
      return elements.filter((element) => bloc !== undefined && element.blocs.split(" ").includes(bloc));
    },
  };
}

describe("surligner", () => {
  it("surligne le bloc de l'écran", () => {
    const cout = new FauxElement("cout", { top: 300, bottom: 360 });
    const delai = new FauxElement("delai", { top: 400, bottom: 460 });
    surligner(pageAvec(cout, delai), "cout", REGLAGES);
    assert.equal(cout.surligne, true);
    assert.equal(delai.surligne, false);
  });
  it("ne fait pas défiler la page quand le bloc est déjà bien visible", () => {
    const cout = new FauxElement("cout", { top: 0.2 * HAUTEUR, bottom: 0.6 * HAUTEUR });
    surligner(pageAvec(cout), "cout", REGLAGES);
    assert.deepEqual(cout.defilements, []);
  });
  it("amène au milieu de l'écran un bloc qui est trop bas, ou trop haut, ou coupé", () => {
    for (const position of [
      { top: 0.8 * HAUTEUR, bottom: 0.9 * HAUTEUR },
      { top: 0.02 * HAUTEUR, bottom: 0.1 * HAUTEUR },
      { top: 0.5 * HAUTEUR, bottom: 1.2 * HAUTEUR },
      { top: 1.5 * HAUTEUR, bottom: 1.6 * HAUTEUR },
    ]) {
      const piece = new FauxElement("piece-1", position);
      surligner(pageAvec(piece), "piece-1", REGLAGES);
      assert.deepEqual(piece.defilements, [{ behavior: "smooth", block: "center" }], JSON.stringify(position));
    }
  });
  it("défile sans animation pour une personne qui les a désactivées", () => {
    const cout = new FauxElement("cout", { top: 0.9 * HAUTEUR, bottom: HAUTEUR });
    surligner(pageAvec(cout), "cout", { ...REGLAGES, mouvementReduit: true });
    assert.deepEqual(cout.defilements, [{ behavior: "auto", block: "center" }]);
  });
  it("fait défiler quand le bloc ne sait pas dire où il est", () => {
    const sansPosition: ElementSurlignable = {
      setAttribute() {},
      removeAttribute() {},
      scrollIntoView: (options) => assert.equal(options.block, "center"),
    };
    surligner({ querySelectorAll: () => [sansPosition] }, "cout", REGLAGES);
  });
  it("rend une fonction qui retire le surlignage", () => {
    const cout = new FauxElement("cout");
    const retirer = surligner(pageAvec(cout), "cout", REGLAGES);
    retirer();
    assert.equal(cout.surligne, false);
  });
  it("surligne tous les blocs qui portent le même repère, et défile jusqu'au premier", () => {
    const note = new FauxElement("a-confirmer", { top: 0.9 * HAUTEUR, bottom: 0.95 * HAUTEUR });
    const piece = new FauxElement("piece-2 a-confirmer", { top: 0.95 * HAUTEUR, bottom: HAUTEUR });
    const autre = new FauxElement("piece-1");
    const retirer = surligner(pageAvec(note, piece, autre), "a-confirmer", REGLAGES);
    assert.equal(note.surligne && piece.surligne, true);
    assert.equal(autre.surligne, false);
    assert.equal(note.defilements.length, 1);
    assert.equal(piece.defilements.length, 0);
    retirer();
    assert.equal(note.surligne || piece.surligne, false);
  });
  it("ne confond pas « piece-1 » avec « piece-10 »", () => {
    const dixieme = new FauxElement("piece-10");
    surligner(pageAvec(dixieme), "piece-1", REGLAGES);
    assert.equal(dixieme.surligne, false);
  });
  it("ne fait rien quand aucun bloc ne porte ce repère", () => {
    const cout = new FauxElement("cout");
    const retirer = surligner(pageAvec(cout), "lieu", REGLAGES);
    assert.equal(cout.surligne, false);
    retirer();
  });
  it("refuse un repère qui n'est pas de la forme prévue, sans interroger la page", () => {
    const page = pageAvec(new FauxElement("cout"));
    const retirer = surligner(page, 'cout"] , [x', REGLAGES);
    assert.deepEqual(page.selecteurs, []);
    retirer();
  });
  it("accepte un élément qui ne sait pas défiler", () => {
    const sansDefilement: ElementSurlignable = { setAttribute() {}, removeAttribute() {} };
    const racine: Racine = { querySelectorAll: () => [sansDefilement] };
    surligner(racine, "cout", REGLAGES)();
  });
});
