// Tests de la vie privée du journal : ce que la base reçoit quand la question ou le commentaire contient un numéro ou un
// e-mail. Une fausse requête capte les valeurs envoyées ; aucune base, aucun réseau. Les numéros sont manifestement
// fictifs. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Reponse } from "../ai/ask";
import type { Fiche } from "../fiches/schema";
import { LONGUEUR_MAX_COMMENTAIRE } from "../texte";
import { creerJournal, LONGUEUR_MAX_QUESTION_JOURNAL, type Requete } from "./journal";
import { creerServiceAvis } from "./service";

const IDENTIFIANT = "3f2a9c1e-5b7d-4e8a-9c3b-1a2b3c4d5e6f";

type Appel = { texte: string; valeurs: readonly unknown[] };

/** Fausse base : note chaque requête reçue. */
function fausseBase() {
  const appels: Appel[] = [];
  const requete: Requete = async (texte, valeurs) => {
    appels.push({ texte, valeurs });
    return [];
  };
  return { requete, appels };
}

/** Toutes les chaînes envoyées à la base, y compris celles d'une liste (les fiches montrées). */
function chainesEnvoyees(appels: Appel[]): string[] {
  return appels.flatMap((appel) => appel.valeurs.flat().filter((valeur): valeur is string => typeof valeur === "string"));
}

/** Le plus grand nombre de chiffres d'une même suite, espaces, points et tirets ignorés. */
function plusLongueSuiteDeChiffres(texte: string): number {
  const suites = texte.match(/\p{Nd}(?:[\s.\-‐-―−]*\p{Nd})*/gu) ?? [];
  return Math.max(0, ...suites.map((suite) => Array.from(suite).filter((c) => /\p{Nd}/u.test(c)).length));
}

type Cas = {
  nom: string;
  texte: string;
  /** Ce qui ne doit jamais atteindre la base (comparé sans espaces, points ni tirets). */
  donnee: string;
  /** Les mots qui doivent rester : la question garde son sens pour qui lit le journal. */
  mots: string[];
};

const CAS: Cas[] = [
  {
    nom: "carte d'identité à 13 chiffres collés",
    texte: "Ma CNI 1234567890123 est perdue, que faire ?",
    donnee: "1234567890123",
    mots: ["Ma", "CNI", "est", "perdue", "que", "faire"],
  },
  {
    nom: "carte d'identité à 13 chiffres avec espaces",
    texte: "J'ai perdu ma carte 1 234 567 890 123, que faire ?",
    donnee: "1234567890123",
    mots: ["perdu", "carte", "que", "faire"],
  },
  {
    nom: "téléphone avec +221",
    texte: "Rappelez-moi au +221 77 123 45 67 pour le passeport",
    donnee: "221771234567",
    mots: ["Rappelez-moi", "passeport"],
  },
  {
    nom: "téléphone avec 00221",
    texte: "Mon numéro : 00221 77 123 45 67, merci",
    donnee: "00221771234567",
    mots: ["numéro", "merci"],
  },
  {
    nom: "téléphone sénégalais par groupes",
    texte: "Appelez le 77 123 45 67 pour la carte grise",
    donnee: "771234567",
    mots: ["Appelez", "carte", "grise"],
  },
  {
    nom: "téléphone sénégalais avec tirets",
    texte: "Mon numéro est 77-123-45-67 pour le permis",
    donnee: "771234567",
    mots: ["numéro", "permis"],
  },
  {
    nom: "adresse e-mail",
    texte: "Écrivez-moi à moussa.diop@example.sn pour le dossier",
    donnee: "moussa.diop@example.sn",
    mots: ["Écrivez-moi", "dossier"],
  },
  {
    nom: "numéro de passeport",
    texte: "Mon passeport AB1234567 expire bientôt, comment le renouveler ?",
    donnee: "AB1234567",
    mots: ["passeport", "expire", "bientôt", "comment", "renouveler"],
  },
  {
    nom: "texte mêlé (wolof, e-mail, téléphone, carte, montant)",
    texte: "Nanga def ? Sama mail mooy a@b.sn, sama numéro 77 123 45 67, CNI 1234567890123 : ñaata la pasaar bi, 10 000 FCFA ?",
    donnee: "1234567890123",
    mots: ["Nanga", "def", "Sama", "mail", "mooy", "numéro", "CNI", "ñaata", "pasaar", "bi", "10 000 FCFA"],
  },
];

function verifier(texteEnvoye: string, cas: Cas) {
  const sansSeparateurs = texteEnvoye.replace(/[\s.\-+]/g, "");
  assert.equal(sansSeparateurs.includes(cas.donnee.replace(/[\s.\-+]/g, "")), false, `« ${texteEnvoye} » garde la donnée`);
  assert.equal(texteEnvoye.includes("@"), false, `« ${texteEnvoye} » garde un e-mail`);
  assert.ok(plusLongueSuiteDeChiffres(texteEnvoye) < 8, `« ${texteEnvoye} » garde une suite de 8 chiffres ou plus`);
  for (const mot of cas.mots) assert.ok(texteEnvoye.includes(mot), `le mot « ${mot} » a disparu de « ${texteEnvoye} »`);
}

describe("noterReponse : la question est masquée avant d'être écrite", () => {
  for (const cas of CAS) {
    it(cas.nom, async () => {
      const base = fausseBase();
      const journal = creerJournal({ requete: base.requete });

      const note = await journal.noterReponse(IDENTIFIANT, { question: cas.texte, repondue: true, fiches: ["carte-identite"] });

      assert.equal(note, true);
      assert.equal(base.appels.length, 1);
      for (const envoye of chainesEnvoyees(base.appels)) assert.equal(envoye.includes(cas.donnee), false);
      verifier(base.appels[0].valeurs[1] as string, cas);
    });
  }

  it("ne change rien d'autre à la requête : même SQL, mêmes autres valeurs", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });

    await journal.noterReponse(IDENTIFIANT, { question: "Ma CNI 1234567890123", repondue: false, fiches: ["a", "b"] });

    assert.equal(base.appels[0].texte, "insert into question_logs (id, question, answered, fiche_slugs) values ($1, $2, $3, $4)");
    assert.deepEqual(base.appels[0].valeurs, [IDENTIFIANT, "Ma CNI [numéro]", false, ["a", "b"]]);
  });

  it("garde à l'identique une question sans donnée personnelle, avec ses chiffres de la vie courante", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });
    const question = "Combien coûte la carte, 10 000 FCFA ? Elle dure 5 ans, 3 jours de délai, timbre 75 FCFA, en 2026, loi 72-61.";

    await journal.noterReponse(IDENTIFIANT, { question, repondue: true, fiches: [] });

    assert.equal(base.appels[0].valeurs[1], question);
  });

  it("masque avant de couper : un numéro à cheval sur la coupe ne laisse aucun chiffre", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });
    const question = `${"x".repeat(LONGUEUR_MAX_QUESTION_JOURNAL - 6)} 1234567890123 fin`;

    await journal.noterReponse(IDENTIFIANT, { question, repondue: true, fiches: [] });

    const ecrite = base.appels[0].valeurs[1] as string;
    assert.equal(Array.from(ecrite).length, LONGUEUR_MAX_QUESTION_JOURNAL);
    assert.equal(/\d/.test(ecrite), false, "un bout du numéro est resté");
  });

  it("coupe encore à 500 caractères quand l'étiquette est plus longue que le numéro", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });
    const question = "tel 771234567 ".repeat(100);

    await journal.noterReponse(IDENTIFIANT, { question, repondue: true, fiches: [] });

    assert.equal(Array.from(base.appels[0].valeurs[1] as string).length, LONGUEUR_MAX_QUESTION_JOURNAL);
  });
});

describe("noterAvis : le commentaire est masqué avant d'être écrit", () => {
  for (const cas of CAS) {
    it(cas.nom, async () => {
      const base = fausseBase();
      const journal = creerJournal({ requete: base.requete });

      const note = await journal.noterAvis({ journalId: IDENTIFIANT, utile: false, commentaire: cas.texte });

      assert.equal(note, true);
      assert.equal(base.appels.length, 1);
      for (const envoye of chainesEnvoyees(base.appels)) assert.equal(envoye.includes(cas.donnee), false);
      verifier(base.appels[0].valeurs[2] as string, cas);
    });
  }

  it("ne change rien d'autre à la requête : même SQL, mêmes autres valeurs", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });

    await journal.noterAvis({ journalId: IDENTIFIANT, utile: true, commentaire: "Appelez le 77 123 45 67" });

    assert.equal(
      base.appels[0].texte,
      "insert into feedback (question_log_id, helpful, comment) values ((select id from question_logs where id = $1), $2, $3)",
    );
    assert.deepEqual(base.appels[0].valeurs, [IDENTIFIANT, true, "Appelez le [téléphone]"]);
  });

  it("garde un commentaire vide (valeur nulle) et un commentaire sans donnée à l'identique", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });

    await journal.noterAvis({ journalId: IDENTIFIANT, utile: true, commentaire: null });
    await journal.noterAvis({ journalId: IDENTIFIANT, utile: false, commentaire: "Il manque le prix, 10 000 FCFA, et le délai de 3 jours" });

    assert.equal(base.appels[0].valeurs[2], null);
    assert.equal(base.appels[1].valeurs[2], "Il manque le prix, 10 000 FCFA, et le délai de 3 jours");
  });

  it("recoupe à 500 caractères quand les étiquettes allongent le commentaire : la base ne refuse pas l'avis", async () => {
    const base = fausseBase();
    const journal = creerJournal({ requete: base.requete });
    // 35 × 14 = 490 caractères : le commentaire tient dans la limite avant le masque, et la dépasse après (35 × 16 = 560).
    const commentaire = "tel 771234567 ".repeat(35);
    assert.ok(Array.from(commentaire).length <= LONGUEUR_MAX_COMMENTAIRE);

    await journal.noterAvis({ journalId: IDENTIFIANT, utile: false, commentaire });

    const ecrit = base.appels[0].valeurs[2] as string;
    assert.ok(Array.from(ecrit).length <= LONGUEUR_MAX_COMMENTAIRE, `${Array.from(ecrit).length} caractères`);
    assert.equal(/\d/.test(ecrit), false);
  });
});

describe("le service d'avis n'a pas d'autre chemin vers la base", () => {
  const fiche = { slug: "carte-identite" } as Fiche;
  const reponseFiche: Reponse = { type: "fiche", fiche, autres: [], intro: null, degrade: null, rejet: null };

  function serviceSurFausseBase() {
    const base = fausseBase();
    const travaux: (() => Promise<unknown>)[] = [];
    const service = creerServiceAvis({
      journal: creerJournal({ requete: base.requete }),
      limiteurAvis: { autoriser: () => true },
      limiteurJournal: { autoriser: () => true },
      apres: (travail) => travaux.push(travail),
      nouvelIdentifiant: () => IDENTIFIANT,
    });
    return { service, base, travaux };
  }

  for (const cas of CAS) {
    it(`la réponse montrée est notée sans donnée : ${cas.nom}`, async () => {
      const { service, base, travaux } = serviceSurFausseBase();

      const id = service.noterLaReponse(cas.texte, reponseFiche, "203.0.113.7");
      for (const travail of travaux) await travail();

      assert.equal(id, IDENTIFIANT);
      assert.equal(base.appels.length, 1);
      verifier(base.appels[0].valeurs[1] as string, cas);
    });

    it(`l'avis reçu par POST est noté sans donnée : ${cas.nom}`, async () => {
      const { service, base } = serviceSurFausseBase();
      const demande = new Request("https://demarche-bi.example/api/feedback", {
        method: "POST",
        body: JSON.stringify({ journalId: IDENTIFIANT, utile: false, commentaire: cas.texte }),
      });

      const resultat = await service.enregistrerLAvis(demande);

      assert.deepEqual(resultat, { ok: true });
      assert.equal(base.appels.length, 1);
      verifier(base.appels[0].valeurs[2] as string, cas);
    });
  }
});
