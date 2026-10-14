// Tests des questions générées et du jugement de fidélité. Aucune requête réseau : les fiches des tests de jugement
// sont des données FICTIVES ; la génération est aussi vérifiée sur les vraies fiches de content/demarches/.
// Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { Reponse } from "../ai/ask";
import { ficheDeTest } from "../ai/fiche-de-test";
import { FICHES_DIR, loadFiches } from "../fiches/load";
import type { Fiche } from "../fiches/schema";
import { LONGUEUR_MAX_QUESTION } from "../texte";
import {
  CHAMPS,
  genererQuestionsFidelite,
  jugerFidelite,
  valeurDuChamp,
  type Champ,
  type QuestionFidelite,
} from "./questions-fidelite";

const complete = ficheDeTest({
  slug: "carte",
  titre: "Carte de test",
  pieces: ["Une photo d'identité", "Un justificatif de domicile"],
  cout: "Timbre de 10 000 FCFA",
  delai: "2 jours",
  lieu: "Commissariat de Dakar",
  corps: "Texte libre. Un autre document est valable 3 jours.",
});
const videuse = ficheDeTest({ slug: "vide", titre: "Fiche sans champs", pieces: [], cout: null, delai: null, lieu: null });
const brouillon = ficheDeTest({ slug: "brouillon", titre: "Fiche en brouillon", statut: "brouillon", verifie_le: null, verifie_par: null });

describe("genererQuestionsFidelite", () => {
  it("fait une question par fiche vérifiée et par champ, sans les brouillons", () => {
    const questions = genererQuestionsFidelite([complete, videuse, brouillon]);
    assert.equal(questions.length, 2 * CHAMPS.length);
    assert.deepEqual(
      questions.map((q) => `${q.fiche_slug}/${q.champ}`),
      ["carte/cout", "carte/delai", "carte/lieu", "carte/pieces", "vide/cout", "vide/delai", "vide/lieu", "vide/pieces"],
    );
    assert.ok(!questions.some((q) => q.fiche_slug === "brouillon"));
  });

  it("reprend la valeur de la fiche, ou attend « ne_sait_pas » quand elle manque (liste de pièces vide comprise)", () => {
    const questions = genererQuestionsFidelite([complete, videuse]);
    const de = (slug: string, champ: Champ) => questions.find((q) => q.fiche_slug === slug && q.champ === champ);
    assert.deepEqual(de("carte", "cout"), {
      question: "Combien coûte « Carte de test » ?",
      champ: "cout",
      fiche_slug: "carte",
      valeur: "Timbre de 10 000 FCFA",
      attendu: "valeur",
    });
    assert.deepEqual(de("carte", "pieces")?.valeur, ["Une photo d'identité", "Un justificatif de domicile"]);
    for (const champ of CHAMPS) {
      assert.equal(de("carte", champ)?.attendu, "valeur", champ);
      assert.equal(de("vide", champ)?.attendu, "ne_sait_pas", champ);
      assert.equal(de("vide", champ)?.valeur, null, champ);
    }
  });

  it("pose la question avec le titre de la fiche, en deux formulations", () => {
    const premiere = genererQuestionsFidelite([complete], { variante: 0 });
    const seconde = genererQuestionsFidelite([complete], { variante: 1 });
    assert.equal(premiere.length, seconde.length);
    premiere.forEach((q, i) => {
      assert.ok(q.question.includes("« Carte de test »"), q.question);
      assert.ok(q.question.endsWith("?"), q.question);
      assert.ok(seconde[i].question.includes("« Carte de test »"), seconde[i].question);
      assert.notEqual(q.question, seconde[i].question);
      assert.equal(q.champ, seconde[i].champ);
    });
    assert.deepEqual(genererQuestionsFidelite([complete]), premiere);
  });

  it("peut se limiter à certains champs", () => {
    const questions = genererQuestionsFidelite([complete, videuse], { champs: ["lieu", "cout"] });
    assert.deepEqual(
      questions.map((q) => `${q.fiche_slug}/${q.champ}`),
      ["carte/lieu", "carte/cout", "vide/lieu", "vide/cout"],
    );
  });

  it("ne rend rien sans fiche vérifiée", () => {
    assert.deepEqual(genererQuestionsFidelite([]), []);
    assert.deepEqual(genererQuestionsFidelite([brouillon]), []);
  });
});

describe("genererQuestionsFidelite sur les vraies fiches", () => {
  const { fiches } = loadFiches();
  const verifiees = fiches.filter((fiche) => fiche.statut === "verifie");
  const brouillons = new Set(fiches.filter((fiche) => fiche.statut !== "verifie").map((fiche) => fiche.slug));

  it("lit des fiches", () => {
    assert.ok(verifiees.length > 0, "aucune fiche vérifiée dans content/demarches/");
  });

  for (const variante of [0, 1] as const) {
    it(`fait ${CHAMPS.length} questions par fiche vérifiée (formulation ${variante})`, () => {
      const questions = genererQuestionsFidelite(fiches, { variante });
      assert.equal(questions.length, CHAMPS.length * verifiees.length);
      for (const fiche of verifiees) {
        assert.deepEqual(
          questions.filter((q) => q.fiche_slug === fiche.slug).map((q) => q.champ),
          [...CHAMPS],
          fiche.slug,
        );
      }
      assert.ok(!questions.some((q) => brouillons.has(q.fiche_slug)), "une question porte sur un brouillon");
      assert.equal(new Set(questions.map((q) => q.question)).size, questions.length, "deux questions identiques");
      for (const q of questions) {
        assert.ok(q.question.length <= LONGUEUR_MAX_QUESTION, `${q.question.length} caractères : ${q.question}`);
      }
    });
  }

  it("attend « ne_sait_pas » exactement pour les champs vides de content/, comptés dans les fichiers", () => {
    // Décompte indépendant du générateur : on lit l'en-tête de chaque fichier de fiche vérifiée.
    const compteFichiers = Object.fromEntries(CHAMPS.map((champ) => [champ, 0])) as Record<Champ, number>;
    for (const fichier of fs.readdirSync(FICHES_DIR).filter((nom) => nom.endsWith(".md") && !nom.startsWith("_"))) {
      const source = fs.readFileSync(path.join(FICHES_DIR, fichier), "utf8");
      const entete = source.split(/^---\s*$/m)[1] ?? "";
      if (!/^statut:\s*"?verifie"?\s*$/m.test(entete)) continue;
      for (const champ of ["cout", "delai", "lieu"] as const) {
        if (new RegExp(`^${champ}:\\s*null\\s*$`, "m").test(entete)) compteFichiers[champ] += 1;
      }
      if (!/^pieces:\s*$/m.test(entete) || /^pieces:\s*\[\s*\]\s*$/m.test(entete)) compteFichiers.pieces += 1;
    }

    const questions = genererQuestionsFidelite(fiches);
    for (const champ of CHAMPS) {
      const sansReponse = questions.filter((q) => q.champ === champ && q.attendu === "ne_sait_pas");
      assert.equal(sansReponse.length, compteFichiers[champ], champ);
      assert.ok(sansReponse.every((q) => q.valeur === null), champ);
      assert.ok(questions.filter((q) => q.champ === champ && q.attendu === "valeur").every((q) => q.valeur !== null), champ);
    }
    const total = questions.filter((q) => q.attendu === "ne_sait_pas").length;
    assert.equal(total, CHAMPS.reduce((somme, champ) => somme + compteFichiers[champ], 0));
  });
});

// ---------------------------------------------------------------------------------------------------------------------

function question(champ: Champ, surcharge: Partial<QuestionFidelite> = {}, f: Fiche = complete): QuestionFidelite {
  const valeur = valeurDuChamp(f, champ);
  return {
    question: `Question de test sur ${champ} ?`,
    champ,
    fiche_slug: f.slug,
    valeur,
    attendu: valeur === null ? "ne_sait_pas" : "valeur",
    ...surcharge,
  };
}

function reponseFiche(f: Fiche, intro: string | null, rejet: string | null = null): Reponse {
  return { type: "fiche", fiche: f, autres: [], intro, degrade: null, rejet };
}

describe("jugerFidelite : fiche avec valeur", () => {
  it("dit fidèle une introduction qui reprend la fiche", () => {
    const jugement = jugerFidelite(question("cout"), {
      reponse: reponseFiche(complete, "Le timbre coûte 10.000 FCFA."),
      introBrute: "Le timbre coûte 10.000 FCFA.",
    });
    assert.deepEqual(jugement, { statut: "fidele", bonneFiche: true, absentsFinal: [], absentsBrut: [] });
  });

  it("dit invente quand l'introduction montrée contient un élément absent de la fiche", () => {
    const jugement = jugerFidelite(question("cout"), {
      reponse: reponseFiche(complete, "Le timbre coûte 15 000 FCFA."),
      introBrute: "Le timbre coûte 15 000 FCFA.",
    });
    assert.equal(jugement.statut, "invente");
    assert.deepEqual(jugement.absentsFinal, [{ type: "montant", texte: "15 000 FCFA" }]);
    assert.deepEqual(jugement.absentsBrut, [{ type: "montant", texte: "15 000 FCFA" }]);
  });

  it("dit invente pour une durée convertie, un nom propre inconnu ou un nombre ajouté", () => {
    for (const intro of ["C'est prêt en 48 heures.", "Va à la Préfecture de Dakar.", "Apporte 7 photos."]) {
      const jugement = jugerFidelite(question("delai"), { reponse: reponseFiche(complete, intro), introBrute: intro });
      assert.equal(jugement.statut, "invente", intro);
    }
  });

  it("dit corrigé par les garde-fous quand le modèle inventait et que la sortie montrée est propre", () => {
    const jugement = jugerFidelite(question("delai"), {
      reponse: reponseFiche(complete, "C'est prêt en 2 jours."),
      introBrute: "C'est prêt en 5 jours.",
    });
    assert.equal(jugement.statut, "corrige_par_garde_fous");
    assert.deepEqual(jugement.absentsFinal, []);
    assert.deepEqual(jugement.absentsBrut, [{ type: "duree", texte: "5 jours" }]);
  });

  it("dit corrigé par les garde-fous quand l'introduction inventée a été retirée", () => {
    const jugement = jugerFidelite(question("delai"), {
      reponse: reponseFiche(complete, null, "Nombre « 5 » absent de la fiche."),
      introBrute: "C'est prêt en 5 jours.",
    });
    assert.equal(jugement.statut, "corrige_par_garde_fous");
    assert.deepEqual(jugement.absentsFinal, []);
    assert.equal(jugement.absentsBrut.length, 1);
  });

  it("dit sans introduction quand la fiche est montrée seule", () => {
    assert.equal(jugerFidelite(question("lieu"), { reponse: reponseFiche(complete, null), introBrute: null }).statut, "sans_intro");
    // L'IA a écrit sans inventer, mais un autre garde-fou a refusé le texte : rien d'inventé n'est montré.
    const refusee = jugerFidelite(question("lieu"), {
      reponse: reponseFiche(complete, null, "Mot absolu « toujours » absent de la fiche."),
      introBrute: "Va toujours au Commissariat de Dakar.",
    });
    assert.equal(refusee.statut, "sans_intro");
  });

  it("dit refus quand le site ne montre pas de fiche", () => {
    const reponses: Reponse[] = [
      { type: "inconnue" },
      { type: "hors_domaine", message: "Ce n'est pas mon domaine." },
      { type: "precision_generale", question: "Lequel ?" },
      { type: "precision", options: [complete], question: "Que veux-tu faire ?" },
    ];
    for (const reponse of reponses) {
      assert.deepEqual(jugerFidelite(question("cout"), { reponse, introBrute: null }), {
        statut: "refus",
        bonneFiche: false,
        absentsFinal: [],
        absentsBrut: [],
      });
    }
  });

  it("contrôle la fiche citée, et dit si ce n'est pas la bonne", () => {
    const autre = ficheDeTest({ slug: "autre", titre: "Autre fiche de test", cout: "5 000 FCFA" });
    const jugement = jugerFidelite(question("cout"), { reponse: reponseFiche(autre, "Compte 5 000 FCFA."), introBrute: null });
    assert.equal(jugement.bonneFiche, false);
    assert.equal(jugement.statut, "fidele");
    const faux = jugerFidelite(question("cout"), { reponse: reponseFiche(autre, "Compte 10 000 FCFA."), introBrute: null });
    assert.equal(faux.bonneFiche, false);
    assert.equal(faux.statut, "invente");
  });

  it("tolère un nom de la question, jamais un nombre de la question", () => {
    const q = question("lieu", { question: "Où faire ma carte à Thiès, en 4 jours ?" });
    assert.equal(jugerFidelite(q, { reponse: reponseFiche(complete, "À Thiès, va au Commissariat de Dakar."), introBrute: null }).statut, "fidele");
    assert.equal(jugerFidelite(q, { reponse: reponseFiche(complete, "Compte 4 jours."), introBrute: null }).statut, "invente");
  });

  it("ne reproche pas à l'IA de dire « pas précisé » quand la fiche donne la valeur", () => {
    const intro = "Le coût n'est pas précisé ici.";
    assert.equal(jugerFidelite(question("cout"), { reponse: reponseFiche(complete, intro), introBrute: intro }).statut, "fidele");
  });
});

describe("jugerFidelite : champ vide (null)", () => {
  it("dit fidèle une introduction qui dit « pas précisé »", () => {
    const cas: [Champ, string][] = [
      ["cout", "Le coût n'est pas précisé dans la fiche."],
      ["delai", "Le délai n'est pas indiqué."],
      ["lieu", "La fiche ne précise pas le lieu."],
      ["pieces", "Les pièces ne sont pas précisées."],
    ];
    for (const [champ, intro] of cas) {
      const jugement = jugerFidelite(question(champ, {}, videuse), { reponse: reponseFiche(videuse, intro), introBrute: intro });
      assert.equal(jugement.statut, "fidele", intro);
      assert.equal(jugement.bonneFiche, true);
    }
  });

  it("dit deviné quand l'introduction donne une valeur au lieu de « pas précisé »", () => {
    const cas: [Champ, string][] = [
      ["cout", "C'est gratuit."],
      ["delai", "C'est prêt le jour même."],
      ["lieu", "Va au commissariat de ton quartier."],
      ["pieces", "Il faut une photo, un acte de naissance et un timbre."],
    ];
    for (const [champ, intro] of cas) {
      const jugement = jugerFidelite(question(champ, {}, videuse), { reponse: reponseFiche(videuse, intro), introBrute: intro });
      assert.equal(jugement.statut, "devine", intro);
      assert.deepEqual(jugement.absentsFinal, [], intro);
    }
  });

  it("dit deviné quand la valeur donnée figure ailleurs dans la fiche mais pas dans le champ", () => {
    // « 3 jours » est dans le corps de la fiche : aucun élément absent, mais le champ « délai » est vide.
    const fiche = ficheDeTest({ slug: "corps", titre: "Fiche au corps bavard", delai: null, corps: "Un autre document est valable 3 jours." });
    const intro = "C'est prêt en 3 jours.";
    const jugement = jugerFidelite(question("delai", {}, fiche), { reponse: reponseFiche(fiche, intro), introBrute: intro });
    assert.equal(jugement.statut, "devine");
    assert.deepEqual(jugement.absentsFinal, []);
  });

  it("dit invente (et non deviné) quand la valeur donnée est en plus absente de la fiche", () => {
    const intro = "C'est prêt en 3 jours.";
    const jugement = jugerFidelite(question("delai", {}, videuse), { reponse: reponseFiche(videuse, intro), introBrute: intro });
    assert.equal(jugement.statut, "invente");
  });

  it("dit fidèle une introduction qui ne parle pas du champ", () => {
    const intro = "Voici ce que la fiche dit sur cette démarche.";
    assert.equal(jugerFidelite(question("cout", {}, videuse), { reponse: reponseFiche(videuse, intro), introBrute: intro }).statut, "fidele");
  });

  it("accepte une introduction absente et une réponse « je ne sais pas »", () => {
    assert.equal(jugerFidelite(question("cout", {}, videuse), { reponse: reponseFiche(videuse, null), introBrute: null }).statut, "sans_intro");
    assert.equal(jugerFidelite(question("cout", {}, videuse), { reponse: { type: "inconnue" }, introBrute: null }).statut, "refus");
  });

  it("ne dit pas deviné quand la fiche citée, elle, a la valeur", () => {
    // La question visait une fiche sans coût ; le site en cite une autre qui en a un : c'est une erreur de fiche, pas une invention.
    const q = question("cout", {}, videuse);
    const jugement = jugerFidelite(q, { reponse: reponseFiche(complete, "Le timbre coûte 10 000 FCFA."), introBrute: null });
    assert.equal(jugement.statut, "fidele");
    assert.equal(jugement.bonneFiche, false);
  });
});
