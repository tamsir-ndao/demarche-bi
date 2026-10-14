// Tests des jeux de questions de fiabilité : eval/fiabilite-saisie.jsonl et eval/fiabilite-refus.jsonl.
// Ils lisent les fichiers sur disque et les VRAIES fiches de content/demarches : aucune IA, aucun réseau.
// Lancer : npm test (depuis la racine du dépôt, comme les autres tests qui lisent content/).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { loadFiches } from "../fiches/load";
import type { Fiche } from "../fiches/schema";
import { simplifier } from "../texte";
import { LANGUES, parseQuestions, verifierDonnees, type Question } from "./retrieval";

function lireJeu(nom: string): { questions: Question[]; erreurs: string[] } {
  return parseQuestions(fs.readFileSync(path.join(process.cwd(), "eval", nom), "utf8"));
}

const saisie = lireJeu("fiabilite-saisie.jsonl");
const refus = lireJeu("fiabilite-refus.jsonl");
// eval/questions.jsonl est en lecture seule ici : on s'en sert uniquement pour repérer les doublons.
const reference = lireJeu("questions.jsonl");
const { fiches, errors: erreursFiches } = loadFiches();

/** La question réduite à ses mots (sans accents, casse ni ponctuation) : deux écritures proches donnent la même clé. */
function cle(question: string): string {
  return simplifier(question)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Vrai si le texte contient un numéro (7 chiffres ou plus, espaces, points et tirets ignorés : téléphone,
 * CNI, passeport), un indicatif +221 ou 00221, ou une adresse e-mail. Les montants (« 10 000 ») et les durées passent.
 */
function contientNumeroOuEmail(texte: string): boolean {
  const chiffres = texte.replace(/(?<=\d)[ .\-](?=\d)/g, "");
  return /\d{7,}/.test(chiffres) || /(?:\+|\b00)221/.test(texte) || /\S+@\S+/.test(texte);
}

/** Les champs de la fiche où un fait attendu peut se trouver, sur une seule ligne (même base que verifierDonnees). */
function texteDeLaFiche(fiche: Fiche): string {
  return [
    fiche.titre,
    fiche.resume,
    ...fiche.mots_cles,
    ...fiche.pieces,
    ...fiche.etapes,
    fiche.cout ?? "",
    fiche.delai ?? "",
    fiche.lieu ?? "",
    fiche.corps,
  ]
    .join("\n")
    .replace(/\s+/g, " ");
}

function nombre(questions: Question[], condition: (q: Question) => boolean): number {
  return questions.filter(condition).length;
}

const jeux = [
  { nom: "fiabilite-saisie.jsonl", lecture: saisie },
  { nom: "fiabilite-refus.jsonl", lecture: refus },
];

describe("fiches de référence", () => {
  it("se chargent sans erreur", () => {
    assert.deepEqual(erreursFiches, []);
    assert.ok(fiches.length > 0);
  });
});

describe("détecteur de numéros et d'e-mails", () => {
  it("repère les numéros, les indicatifs et les e-mails", () => {
    assert.equal(contientNumeroOuEmail("mon numéro 77 123 45 67"), true);
    assert.equal(contientNumeroOuEmail("appelle le 77-123-45-67"), true);
    assert.equal(contientNumeroOuEmail("ma carte 1 234 567 890 123"), true);
    assert.equal(contientNumeroOuEmail("+221 33 000 00 00"), true);
    assert.equal(contientNumeroOuEmail("écris à exemple@exemple.sn"), true);
  });

  it("laisse passer les montants, les durées et les années", () => {
    assert.equal(contientNumeroOuEmail("10 000 FCFA"), false);
    assert.equal(contientNumeroOuEmail("un timbre de 2 000 FCFA, 3 jours, 5 ans"), false);
    assert.equal(contientNumeroOuEmail("en 2026, loi 72-61"), false);
  });
});

for (const { nom, lecture } of jeux) {
  describe(`eval/${nom}`, () => {
    it("n'a aucune erreur de lecture (parseQuestions)", () => {
      assert.deepEqual(lecture.erreurs, []);
      assert.ok(lecture.questions.length > 0);
    });

    it("colle aux fiches : fiche attendue connue, faits attendus présents (verifierDonnees)", () => {
      assert.deepEqual(verifierDonnees(lecture.questions, fiches), []);
    });

    it("n'attend que des fiches vérifiées (jamais un brouillon, caché en production)", () => {
      for (const q of lecture.questions) {
        if (q.attendu_slug === null) continue;
        const fiche = fiches.find((f) => f.slug === q.attendu_slug);
        assert.equal(fiche?.statut, "verifie", `« ${q.question} » : « ${q.attendu_slug} » n'est pas une fiche vérifiée`);
      }
    });

    it("n'a aucun doublon, ni dans le fichier ni avec eval/questions.jsonl ni avec l'autre jeu", () => {
      const origines = new Map<string, string>();
      const autres = jeux.filter((j) => j.nom !== nom).flatMap((j) => j.lecture.questions);
      for (const q of [...reference.questions, ...autres]) origines.set(cle(q.question), q.question);

      const vues = new Set<string>();
      for (const q of lecture.questions) {
        const k = cle(q.question);
        assert.ok(!vues.has(k), `doublon dans le fichier : « ${q.question} »`);
        assert.ok(!origines.has(k), `« ${q.question} » existe déjà : « ${origines.get(k)} »`);
        vues.add(k);
      }
    });

    it("ne contient ni numéro ni e-mail dans les questions", () => {
      for (const q of lecture.questions) {
        assert.equal(contientNumeroOuEmail(q.question), false, `donnée personnelle possible : « ${q.question} »`);
        for (const fait of q.doit_contenir) {
          assert.equal(contientNumeroOuEmail(fait), false, `donnée personnelle possible : « ${fait} »`);
        }
      }
    });

    it("représente chacune des langues connues (fr, mixte, wo)", () => {
      for (const langue of LANGUES) {
        assert.ok(
          nombre(lecture.questions, (q) => q.langue === langue) > 0,
          `aucune question en « ${langue} » dans ${nom}`,
        );
      }
    });
  });
}

describe("eval/fiabilite-saisie.jsonl : contenu attendu", () => {
  const questions = saisie.questions;

  it("compte au moins 45 questions, presque toutes couvertes, quelques-unes vagues, aucun refus", () => {
    assert.ok(questions.length >= 45, `${questions.length} questions`);
    assert.ok(nombre(questions, (q) => q.famille === "couverte") >= 40);
    assert.ok(nombre(questions, (q) => q.famille === "vague") >= 3);
    assert.equal(nombre(questions, (q) => q.famille === "hors_perimetre"), 0);
  });

  it("compte au moins 9 questions en wolof ou mêlées de wolof, dont 2 en wolof", () => {
    assert.ok(nombre(questions, (q) => q.langue !== "fr") >= 9);
    assert.ok(nombre(questions, (q) => q.langue === "mixte") >= 6);
    assert.ok(nombre(questions, (q) => q.langue === "wo") >= 2);
    assert.ok(nombre(questions, (q) => q.langue === "fr") >= 30);
  });

  it("compte au moins 8 questions dictées avec des hésitations (« euh »)", () => {
    assert.ok(nombre(questions, (q) => /\beuh\b/i.test(q.question)) >= 8);
  });

  it("couvre au moins 15 fiches différentes", () => {
    const slugs = new Set(questions.map((q) => q.attendu_slug).filter((s) => s !== null));
    assert.ok(slugs.size >= 15, `${slugs.size} fiches couvertes`);
  });

  it("prend chaque fait attendu MOT POUR MOT dans la fiche (casse et accents compris)", () => {
    for (const q of questions) {
      const fiche = fiches.find((f) => f.slug === q.attendu_slug);
      if (!fiche) continue; // fiche absente : déjà signalé par verifierDonnees
      const texte = texteDeLaFiche(fiche);
      for (const fait of q.doit_contenir) {
        assert.ok(
          texte.includes(fait.replace(/\s+/g, " ")),
          `« ${fait} » ne figure pas tel quel dans la fiche « ${fiche.slug} »`,
        );
      }
    }
  });
});

describe("eval/fiabilite-refus.jsonl : contenu attendu", () => {
  const questions = refus.questions;

  it("compte au moins 25 questions, toutes hors périmètre et sans fiche attendue", () => {
    assert.ok(questions.length >= 25, `${questions.length} questions`);
    for (const q of questions) {
      assert.equal(q.famille, "hors_perimetre", q.question);
      assert.equal(q.attendu_slug, null, q.question);
      assert.deepEqual(q.doit_contenir, [], q.question);
    }
  });

  it("compte au moins 4 questions en wolof ou mêlées de wolof, dont 2 en wolof", () => {
    assert.ok(nombre(questions, (q) => q.langue !== "fr") >= 4);
    assert.ok(nombre(questions, (q) => q.langue === "mixte") >= 2);
    assert.ok(nombre(questions, (q) => q.langue === "wo") >= 2);
  });

  // Chaque démarche voisine est posée dans le jeu ET n'a pas de fiche à elle (ni titre ni nom de fichier) parmi les
  // fiches vérifiées. Les fiches qui la citent seulement en passant (une pièce, un mot-clé) ne comptent pas.
  const voisines: { nom: string; question: RegExp; fiche: RegExp }[] = [
    { nom: "acte de mariage", question: /acte de mariage/, fiche: /acte de mariage/ },
    { nom: "certificat de résidence", question: /certificat de residence/, fiche: /certificat de residence/ },
    { nom: "carte d'électeur", question: /electeur/, fiche: /electeur/ },
    { nom: "légalisation", question: /legalis/, fiche: /legalis/ },
    { nom: "carte grise d'une voiture neuve", question: /voiture neuve/, fiche: /\bneuf\b|\bneuve\b/ },
    { nom: "carte grise d'un véhicule d'occasion importé", question: /occasion/, fiche: /occasion|importe/ },
    { nom: "jugement d'autorisation d'inscription de naissance", question: /jugement/, fiche: /jugement/ },
    { nom: "vignette automobile", question: /vignette automobile/, fiche: /vignette/ },
  ];

  for (const { nom: voisine, question, fiche } of voisines) {
    it(`pose la démarche voisine « ${voisine} », qui n'a pas de fiche vérifiée`, () => {
      assert.ok(
        questions.some((q) => question.test(simplifier(q.question))),
        `aucune question sur « ${voisine} »`,
      );
      const trouvees = fiches
        .filter((f) => f.statut === "verifie")
        .filter((f) => fiche.test(simplifier(`${f.slug.replace(/-/g, " ")} ${f.titre}`)))
        .map((f) => f.slug);
      assert.deepEqual(trouvees, [], `« ${voisine} » a maintenant une fiche : passe ces questions en « couverte »`);
    });
  }
});
