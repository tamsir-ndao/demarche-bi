// Tests de l'évaluation de bout en bout (avec l'IA). Aucune requête réseau : les réponses du site sont écrites ici.
// Les fiches sont des données FICTIVES de test. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Reponse } from "../ai/ask";
import { ficheDeTest } from "../ai/fiche-de-test";
import { evaluerBoutEnBout, jugerReponse, resumerBoutEnBout, type ResultatBoutEnBout } from "./bout-en-bout";
import type { Question } from "./retrieval";

const carte = ficheDeTest({ slug: "carte", titre: "Carte de test" });
const duplicata = ficheDeTest({ slug: "duplicata", titre: "Duplicata de test" });

function question(surcharge: Partial<Question> & Pick<Question, "question">): Question {
  return { famille: "couverte", langue: "fr", attendu_slug: "carte", doit_contenir: [], ...surcharge };
}

const couverte = question({ question: "Combien coûte la carte ?" });
const horsPerimetre = question({ question: "Visa pour la France", famille: "hors_perimetre", attendu_slug: null });
const vague = question({ question: "Un papier", famille: "vague", attendu_slug: null });

function reponseFiche(surcharge: Partial<Extract<Reponse, { type: "fiche" }>> = {}): Reponse {
  return { type: "fiche", fiche: carte, autres: [], intro: "Une phrase.", degrade: null, rejet: null, ...surcharge };
}
/** Ce que renvoie le lanceur de questions : la réponse du site et le nombre de fois où l'IA a échoué en chemin. */
function posee(reponse: Reponse, echecsIA = 0) {
  return { reponse, echecsIA };
}

const precision: Reponse = { type: "precision", options: [carte, duplicata], question: "Que veux-tu faire ?" };
const precisionGenerale: Reponse = { type: "precision_generale", question: "Lequel ?" };
const inconnue: Reponse = { type: "inconnue" };

describe("jugerReponse : question couverte", () => {
  it("réussit quand la fiche attendue répond", () => {
    assert.deepEqual(jugerReponse(couverte, reponseFiche()), { statut: "reussie", obtenu: "fiche : carte" });
  });

  it("échoue quand une autre fiche répond", () => {
    assert.deepEqual(jugerReponse(couverte, reponseFiche({ fiche: duplicata })), {
      statut: "echouee",
      obtenu: "fiche : duplicata",
    });
  });

  it("réussit à moitié quand l'écran de précision propose la fiche attendue", () => {
    assert.deepEqual(jugerReponse(couverte, precision), { statut: "partielle", obtenu: "précision : carte, duplicata" });
  });

  it("échoue quand l'écran de précision ne propose pas la fiche attendue", () => {
    const sansElle: Reponse = { type: "precision", options: [duplicata], question: "" };
    assert.equal(jugerReponse(couverte, sansElle).statut, "echouee");
  });

  it("échoue quand le site dit qu'il ne sait pas ou demande de préciser sans proposer de démarche", () => {
    assert.deepEqual(jugerReponse(couverte, inconnue), { statut: "echouee", obtenu: "je ne sais pas" });
    assert.deepEqual(jugerReponse(couverte, precisionGenerale), { statut: "echouee", obtenu: "précision générale" });
  });
});

describe("jugerReponse : question hors périmètre", () => {
  it("réussit quand le site dit qu'il ne sait pas", () => {
    assert.deepEqual(jugerReponse(horsPerimetre, inconnue), { statut: "reussie", obtenu: "je ne sais pas" });
  });

  it("échoue dès que le site répond ou demande une précision", () => {
    for (const reponse of [reponseFiche(), precision, precisionGenerale]) {
      assert.equal(jugerReponse(horsPerimetre, reponse).statut, "echouee");
    }
  });
});

describe("jugerReponse : question vague", () => {
  it("réussit quand le site demande de préciser", () => {
    assert.equal(jugerReponse(vague, precision).statut, "reussie");
    assert.equal(jugerReponse(vague, precisionGenerale).statut, "reussie");
  });

  it("réussit à moitié quand le site dit qu'il ne sait pas : rien d'inventé, mais pas d'aide", () => {
    assert.equal(jugerReponse(vague, inconnue).statut, "partielle");
  });

  it("échoue quand le site devine une démarche", () => {
    assert.equal(jugerReponse(vague, reponseFiche()).statut, "echouee");
  });
});

function resultat(surcharge: Partial<ResultatBoutEnBout> & Pick<ResultatBoutEnBout, "question">): ResultatBoutEnBout {
  return { statut: "reussie", obtenu: "fiche : carte", introduction: null, rejet: null, degrade: false, ...surcharge };
}

describe("evaluerBoutEnBout", () => {
  it("pose chaque question dans l'ordre et note l'état de l'introduction", async () => {
    const reponses = [
      posee(reponseFiche()),
      posee(reponseFiche({ intro: null, rejet: "Nombre « 8 » absent de la fiche." })),
      posee(reponseFiche({ intro: null, degrade: "saturee" }), 1),
      posee(inconnue),
    ];
    const posees: string[] = [];
    const resultats = await evaluerBoutEnBout([couverte, couverte, couverte, horsPerimetre], async (q) => {
      posees.push(q.question);
      return reponses[posees.length - 1];
    });

    assert.equal(posees.length, 4);
    assert.deepEqual(
      resultats.map((r) => [r.introduction, r.degrade]),
      [
        ["montree", false],
        ["refusee", false],
        ["absente", true],
        [null, false],
      ],
    );
  });

  it("note qu'une question est passée en repli quand l'IA a échoué, même si le site répond « je ne sais pas »", async () => {
    const [resultat] = await evaluerBoutEnBout([horsPerimetre], async () => posee(inconnue, 1));
    assert.equal(resultat.statut, "reussie");
    assert.equal(resultat.degrade, true);
  });

  it("garde la raison du refus des garde-fous, et rien quand l'introduction est montrée ou absente", async () => {
    const raison = "Nombre « 8 » absent de la fiche.";
    const reponses = [reponseFiche({ intro: null, rejet: raison }), reponseFiche(), inconnue];
    let suivante = 0;
    const resultats = await evaluerBoutEnBout([couverte, couverte, horsPerimetre], async () => posee(reponses[suivante++]));
    assert.deepEqual(
      resultats.map((r) => r.rejet),
      [raison, null, null],
    );
  });

  it("garde le jugement et la description de la réponse", async () => {
    const [resultat] = await evaluerBoutEnBout([couverte], async () => posee(precision));
    assert.equal(resultat.question, couverte);
    assert.equal(resultat.statut, "partielle");
    assert.equal(resultat.obtenu, "précision : carte, duplicata");
  });

  it("attend entre deux questions, pas après la dernière", async () => {
    const attentes: number[] = [];
    await evaluerBoutEnBout([couverte, couverte, couverte], async () => posee(reponseFiche()), {
      pauseMs: 1500,
      dormir: async (ms) => {
        attentes.push(ms);
      },
    });
    assert.deepEqual(attentes, [1500, 1500]);
  });

  it("ne dort pas quand la pause est nulle", async () => {
    let dormi = false;
    await evaluerBoutEnBout([couverte, couverte], async () => posee(reponseFiche()), {
      dormir: async () => {
        dormi = true;
      },
    });
    assert.equal(dormi, false);
  });

  it("signale chaque résultat dès qu'il est connu", async () => {
    const vus: string[] = [];
    await evaluerBoutEnBout([couverte, horsPerimetre], async () => posee(inconnue), {
      surResultat: (r, index) => vus.push(`${index} ${r.question.famille} ${r.statut}`),
    });
    assert.deepEqual(vus, ["0 couverte echouee", "1 hors_perimetre reussie"]);
  });
});

describe("resumerBoutEnBout", () => {
  const resultats: ResultatBoutEnBout[] = [
    resultat({ question: couverte, statut: "reussie", introduction: "montree" }),
    resultat({ question: couverte, statut: "reussie", introduction: "refusee" }),
    resultat({ question: couverte, statut: "partielle", obtenu: "précision : carte, duplicata" }),
    resultat({ question: couverte, statut: "echouee", obtenu: "je ne sais pas" }),
    resultat({ question: horsPerimetre, statut: "reussie", obtenu: "je ne sais pas" }),
    resultat({ question: horsPerimetre, statut: "echouee", introduction: "absente", degrade: true }),
    resultat({ question: vague, statut: "reussie", obtenu: "précision générale" }),
    resultat({ question: question({ question: "Peux-tu m'aider ?", famille: "vague", langue: "wo", attendu_slug: null }), statut: "partielle", obtenu: "je ne sais pas" }),
  ];

  it("compte chaque famille de questions", () => {
    const { global } = resumerBoutEnBout(resultats);
    assert.deepEqual(global.couvertes, { total: 4, reussies: 2, partielles: 1, echouees: 1 });
    assert.deepEqual(global.horsPerimetre, { total: 2, reussies: 1, partielles: 0, echouees: 1 });
    assert.deepEqual(global.vagues, { total: 2, reussies: 1, partielles: 1, echouees: 0 });
  });

  it("compte les introductions montrées, refusées et absentes", () => {
    const { global } = resumerBoutEnBout(resultats);
    assert.deepEqual(global.introductions, { montrees: 1, refusees: 1, absentes: 1 });
  });

  it("compte les questions où l'IA était saturée ou en panne", () => {
    assert.equal(resumerBoutEnBout(resultats).global.degrades, 1);
  });

  it("sépare les résultats par langue", () => {
    const { parLangue } = resumerBoutEnBout(resultats);
    assert.equal(parLangue.fr?.couvertes.total, 4);
    assert.equal(parLangue.wo?.vagues.total, 1);
    assert.equal(parLangue.mixte, undefined);
  });
});
