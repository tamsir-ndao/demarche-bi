// Tests de l'apparition progressive de la réponse : quel bloc se montre quand. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTRIBUT_GROUPE,
  ATTRIBUT_VISIBLE,
  GROUPES_APPARITION,
  groupeDeLaCible,
  groupesJusquA,
  montrer,
  planCascade,
  type GroupeApparition,
} from "./apparition";

describe("groupeDeLaCible", () => {
  it("envoie chaque repère vocal vers son groupe", () => {
    assert.equal(groupeDeLaCible("statut"), "entete");
    assert.equal(groupeDeLaCible("titre"), "entete");
    assert.equal(groupeDeLaCible("intro"), "intro");
    assert.equal(groupeDeLaCible("cout"), "faits");
    assert.equal(groupeDeLaCible("delai"), "faits");
    assert.equal(groupeDeLaCible("lieu"), "faits");
    assert.equal(groupeDeLaCible("a-confirmer"), "a-confirmer");
    assert.equal(groupeDeLaCible("pieces"), "pieces");
    assert.equal(groupeDeLaCible("piece-0"), "pieces");
    assert.equal(groupeDeLaCible("piece-12"), "pieces");
    assert.equal(groupeDeLaCible("etapes"), "etapes");
  });

  it("rend null pour un repère inconnu ou absent", () => {
    assert.equal(groupeDeLaCible(null), null);
    assert.equal(groupeDeLaCible(""), null);
    assert.equal(groupeDeLaCible("sources"), null);
    assert.equal(groupeDeLaCible("piece-"), null);
    assert.equal(groupeDeLaCible("piece-a"), null);
    assert.equal(groupeDeLaCible("pieces-0"), null);
  });
});

describe("groupesJusquA", () => {
  it("rend tous les groupes qui précèdent, et le sien", () => {
    assert.deepEqual(groupesJusquA("pieces"), ["entete", "intro", "faits", "a-confirmer", "pieces"]);
    assert.deepEqual(groupesJusquA("statut"), ["entete"]);
    assert.deepEqual(groupesJusquA("piece-3"), ["entete", "intro", "faits", "a-confirmer", "pieces"]);
    assert.deepEqual(groupesJusquA("etapes"), ["entete", "intro", "faits", "a-confirmer", "pieces", "etapes"]);
  });

  it("rend une liste vide pour un repère inconnu ou absent", () => {
    assert.deepEqual(groupesJusquA(null), []);
    assert.deepEqual(groupesJusquA("inconnu"), []);
  });
});

describe("planCascade", () => {
  it("planifie tous les groupes, dans l'ordre, espacés du pas", () => {
    const plan = planCascade(new Set(), 90);
    assert.deepEqual(
      plan.map((p) => p.groupe),
      [...GROUPES_APPARITION],
    );
    assert.deepEqual(
      plan.map((p) => p.delaiMs),
      [0, 90, 180, 270, 360, 450, 540, 630],
    );
  });

  it("omet les groupes déjà montrés et repart de zéro", () => {
    const deja = new Set<GroupeApparition>(["entete", "intro", "faits"]);
    const plan = planCascade(deja, 40);
    assert.deepEqual(plan, [
      { groupe: "a-confirmer", delaiMs: 0 },
      { groupe: "pieces", delaiMs: 40 },
      { groupe: "etapes", delaiMs: 80 },
      { groupe: "sources", delaiMs: 120 },
      { groupe: "suite", delaiMs: 160 },
    ]);
  });

  it("rend un plan vide quand tout est déjà montré", () => {
    assert.deepEqual(planCascade(new Set(GROUPES_APPARITION), 90), []);
  });
});

/** Un bloc de la page, qui ne sait que recevoir un attribut. */
class FauxBloc {
  attributs = new Map<string, string>();
  constructor(public groupe: string) {}
  setAttribute(nom: string, valeur: string) {
    this.attributs.set(nom, valeur);
  }
  get visible() {
    return this.attributs.has(ATTRIBUT_VISIBLE);
  }
}

/** Une page de faux blocs ; comprend le sélecteur `[data-apparition="groupe"]`. */
function pageAvec(...blocs: FauxBloc[]) {
  const selecteurs: string[] = [];
  return {
    selecteurs,
    querySelectorAll(selecteur: string) {
      selecteurs.push(selecteur);
      const groupe = new RegExp(`^\\[${ATTRIBUT_GROUPE}="([^"]+)"\\]$`).exec(selecteur)?.[1];
      return blocs.filter((bloc) => groupe !== undefined && bloc.groupe === groupe);
    },
  };
}

describe("montrer", () => {
  it("pose data-visible sur tous les blocs du groupe, et seulement eux", () => {
    const entete = new FauxBloc("entete");
    const pieces1 = new FauxBloc("pieces");
    const pieces2 = new FauxBloc("pieces");
    const page = pageAvec(entete, pieces1, pieces2);

    assert.equal(montrer(page, "pieces"), 2);
    assert.ok(pieces1.visible && pieces2.visible);
    assert.ok(!entete.visible);
    assert.deepEqual(page.selecteurs, [`[${ATTRIBUT_GROUPE}="pieces"]`]);
  });

  it("rend 0 quand le groupe n'a aucun bloc (note à confirmer absente)", () => {
    const page = pageAvec(new FauxBloc("entete"));
    assert.equal(montrer(page, "a-confirmer"), 0);
  });

  it("ne construit un sélecteur que pour un groupe de la liste", () => {
    const page = pageAvec(new FauxBloc("entete"));
    // Le type interdit déjà autre chose ; on vérifie que la valeur est contrôlée à l'exécution aussi.
    const faux = '"] , [data-apparition="' as unknown as GroupeApparition;
    assert.equal(montrer(page, faux), 0);
    assert.deepEqual(page.selecteurs, []);
  });
});
