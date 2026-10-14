// Tests du masque du journal : les numéros et les e-mails disparaissent, les chiffres de la vie courante restent.
// Tous les numéros ci-dessous sont manifestement fictifs (suites 1234567…, 000…). Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contientDonneesPersonnelles, masquerDonneesPersonnelles } from "./anonymiser";

/** Le plus grand nombre de chiffres d'une même suite (espaces, points et tirets ignorés) : la propriété du masque est qu'il reste sous 8. */
function plusLongueSuiteDeChiffres(texte: string): number {
  const suites = texte.match(/\p{Nd}(?:[\s.\-‐-―−]*\p{Nd})*/gu) ?? [];
  return Math.max(0, ...suites.map((suite) => Array.from(suite).filter((c) => /\p{Nd}/u.test(c)).length));
}

describe("masquerDonneesPersonnelles : numéros longs", () => {
  const cartesEtNumeros = [
    "1234567890123",
    "1 234 567 890 123",
    "1234 5678 90123",
    "1.234.567.890.123",
    "1-234-567-890-123",
    "1 2 3 4 5 6 7 8 9 0 1 2 3",
    "2 234 567 890 123",
    "4000 0000 0000 0000",
    "12345678",
    "1 234 5678",
  ];
  for (const numero of cartesEtNumeros) {
    it(`masque « ${numero} »`, () => {
      assert.equal(masquerDonneesPersonnelles(`ma carte ${numero} est perdue`), "ma carte [numéro] est perdue");
    });
  }

  it("masque un numéro collé à des lettres", () => {
    assert.equal(masquerDonneesPersonnelles("CNI1234567890123"), "CNI[numéro]");
  });

  it("masque les chiffres pleine chasse et les espaces insécables", () => {
    assert.equal(masquerDonneesPersonnelles("carte １２３４５６７８９０１２３"), "carte [numéro]");
    assert.equal(masquerDonneesPersonnelles("carte 1 234 567 890 123"), "carte [numéro]");
    assert.equal(masquerDonneesPersonnelles("carte 1 234 567 890 123"), "carte [numéro]");
  });

  it("masque une date de naissance complète écrite avec des tirets ou des points (faux positif accepté)", () => {
    assert.equal(masquerDonneesPersonnelles("né le 12-03-1990"), "né le [numéro]");
    assert.equal(masquerDonneesPersonnelles("né le 12.03.1990"), "né le [numéro]");
  });
});

describe("masquerDonneesPersonnelles : téléphones", () => {
  const telephones = [
    "+221 77 123 45 67",
    "+221771234567",
    "+221 77-123-45-67",
    "+221 77 123 45 67",
    "00221 77 123 45 67",
    "00221771234567",
    "221 77 123 45 67",
    "221771234567",
    "77 123 45 67",
    "77-123-45-67",
    "77.123.45.67",
    "771234567",
    "771 234 567",
    "78 123 45 67",
    "76 123 45 67",
    "75 123 45 67",
    "70 123 45 67",
    "33 123 45 67",
    "06 12 34 56 78",
    "0612345678",
    "+33 6 12 34 56 78",
    "0033 6 12 34 56 78",
    "+1 202 555 0100",
  ];
  for (const telephone of telephones) {
    it(`masque « ${telephone} »`, () => {
      assert.equal(masquerDonneesPersonnelles(`appelle-moi au ${telephone} merci`), "appelle-moi au [téléphone] merci");
    });
  }

  it("masque chaque téléphone d'un message qui en contient deux", () => {
    assert.equal(
      masquerDonneesPersonnelles("mon 77 123 45 67 ou le 78 123 45 67 de ma mère"),
      "mon [téléphone] ou le [téléphone] de ma mère",
    );
  });

  it("ne garde pas le point final de la phrase dans le numéro", () => {
    assert.equal(masquerDonneesPersonnelles("Mon numéro, c'est le 77 123 45 67."), "Mon numéro, c'est le [téléphone].");
  });

  it("masque un téléphone collé à un montant : l'étiquette est « [numéro] » mais rien ne reste", () => {
    assert.equal(masquerDonneesPersonnelles("77 123 45 67 10 000 FCFA"), "[numéro] FCFA");
  });
});

describe("masquerDonneesPersonnelles : e-mails", () => {
  const adresses = [
    "moussa@example.com",
    "moussa.diop@example.sn",
    "moussa_diop+demarche@example.co.sn",
    "MOUSSA.DIOP@EXAMPLE.SN",
    "moussa.diop.771234567@example.sn",
    "aïssatou@exemple.sn",
    "a@b.sn",
  ];
  for (const adresse of adresses) {
    it(`masque « ${adresse} »`, () => {
      assert.equal(masquerDonneesPersonnelles(`écris à ${adresse} stp`), "écris à [e-mail] stp");
    });
  }

  it("laisse la ponctuation de la phrase hors de l'adresse", () => {
    assert.equal(masquerDonneesPersonnelles("Mon mail : moussa@example.sn."), "Mon mail : [e-mail].");
    assert.equal(masquerDonneesPersonnelles("(moussa@example.sn)"), "([e-mail])");
  });

  it("ne confond pas un @ isolé avec une adresse", () => {
    assert.equal(masquerDonneesPersonnelles("rdv @ 10 h"), "rdv @ 10 h");
    assert.equal(masquerDonneesPersonnelles("@moussa"), "@moussa");
  });
});

describe("masquerDonneesPersonnelles : passeports", () => {
  const passeports = ["A12345678", "AB1234567", "ab1234567", "A 12345678", "AB 1234567", "A-12345678", "A1234567", "A123456"];
  for (const passeport of passeports) {
    it(`masque « ${passeport} »`, () => {
      assert.equal(masquerDonneesPersonnelles(`mon passeport ${passeport} expire`), "mon passeport [numéro] expire");
    });
  }

  it("ne prend pas pour un passeport un mot suivi d'une année ou d'un montant", () => {
    assert.equal(masquerDonneesPersonnelles("de 2026 à 2028"), "de 2026 à 2028");
    assert.equal(masquerDonneesPersonnelles("passeport 10 000 FCFA"), "passeport 10 000 FCFA");
    assert.equal(masquerDonneesPersonnelles("FCFA 1000"), "FCFA 1000");
  });
});

describe("masquerDonneesPersonnelles : texte mêlé", () => {
  it("masque chaque donnée et garde les mots autour", () => {
    const texte =
      "Salut, c'est Moussa. Mon e-mail est moussa@example.sn, mon numéro 77 123 45 67, ma CNI 1 234 567 890 123 et mon passeport AB1234567 : combien coûte le renouvellement, 10 000 FCFA ?";
    assert.equal(
      masquerDonneesPersonnelles(texte),
      "Salut, c'est Moussa. Mon e-mail est [e-mail], mon numéro [téléphone], ma CNI [numéro] et mon passeport [numéro] : combien coûte le renouvellement, 10 000 FCFA ?",
    );
  });

  it("masque aussi quand la phrase est en wolof", () => {
    assert.equal(
      masquerDonneesPersonnelles("Nanga def ? Sama numéro mooy 77 123 45 67, ñaata la pasaar bi ?"),
      "Nanga def ? Sama numéro mooy [téléphone], ñaata la pasaar bi ?",
    );
  });

  it("garde les retours à la ligne et les espaces d'un texte sans donnée", () => {
    const texte = "ligne 1\nligne 2\t  fin";
    assert.equal(masquerDonneesPersonnelles(texte), texte);
  });
});

describe("masquerDonneesPersonnelles : les chiffres légitimes restent", () => {
  const legitimes = [
    "Combien coûte la carte d'identité, 10 000 FCFA ?",
    "Un passeport vaut 5 ans.",
    "Le délai est de 3 jours.",
    "Le timbre fait 75 FCFA.",
    "Je suis en 2026 et ma carte expire en 2027.",
    "Que dit la loi 72-61 ?",
    "J'ai payé 1 500 FCFA et 100 000 FCFA.",
    "Entre 2 000 et 5 000 FCFA ?",
    "Il y a 48 heures, article 12, page 3.",
    "À 7 h 30, rendez-vous 2 fois.",
    "Je suis né en 1990 à Thiès.",
    "Un numéro de 7 chiffres : 1234567.",
    "C'est le 1er jour, le 14e dossier.",
    "Pour 2 enfants, 25 000 FCFA chacun.",
  ];
  for (const texte of legitimes) {
    it(`garde « ${texte} »`, () => {
      assert.equal(masquerDonneesPersonnelles(texte), texte);
      assert.equal(contientDonneesPersonnelles(texte), false);
    });
  }

  it("garde la chaîne vide et un texte sans chiffre", () => {
    assert.equal(masquerDonneesPersonnelles(""), "");
    assert.equal(masquerDonneesPersonnelles("Bonjour, comment renouveler ma carte ?"), "Bonjour, comment renouveler ma carte ?");
  });
});

describe("contientDonneesPersonnelles", () => {
  it("dit vrai pour un numéro, un téléphone ou un e-mail, faux sinon", () => {
    assert.equal(contientDonneesPersonnelles("ma CNI 1234567890123"), true);
    assert.equal(contientDonneesPersonnelles("77 123 45 67"), true);
    assert.equal(contientDonneesPersonnelles("a@b.sn"), true);
    assert.equal(contientDonneesPersonnelles("passeport A12345678"), true);
    assert.equal(contientDonneesPersonnelles("10 000 FCFA en 2026"), false);
    assert.equal(contientDonneesPersonnelles(""), false);
  });

  it("dit faux sur un texte déjà masqué", () => {
    assert.equal(contientDonneesPersonnelles(masquerDonneesPersonnelles("77 123 45 67 et a@b.sn et 1234567890123")), false);
  });
});

describe("masquerDonneesPersonnelles : propriétés", () => {
  // Un petit générateur déterministe (la même suite à chaque lancement) pour fabriquer des textes variés.
  function generateur(graine: number): (n: number) => number {
    let etat = graine;
    return (n) => {
      etat = (Math.imul(etat, 1664525) + 1013904223) >>> 0;
      return etat % n;
    };
  }

  const MOTS = ["bonjour", "ma", "carte", "passeport", "combien", "coûte", "le", "renouvellement", "Thiès", "ñaata", "pasaar", "bi", "FCFA", "ans", "jours"];
  const LEGITIMES = ["10 000", "5", "3", "75", "2026", "72-61", "1 500", "48", "100 000", "12"];
  const SEPARATEURS = ["", " ", ".", "-", "  ", " - ", " "];

  function nombreLong(hasard: (n: number) => number): string {
    const chiffres = 8 + hasard(8);
    let texte = "";
    for (let i = 0; i < chiffres; i++) {
      texte += String(hasard(10));
      if (i < chiffres - 1) texte += SEPARATEURS[hasard(SEPARATEURS.length)];
    }
    return texte;
  }

  function texteAuHasard(hasard: (n: number) => number): { texte: string; mots: string[] } {
    const morceaux: string[] = [];
    const mots: string[] = [];
    const longueur = 4 + hasard(12);
    for (let i = 0; i < longueur; i++) {
      const choix = hasard(10);
      if (choix < 5) {
        const mot = MOTS[hasard(MOTS.length)];
        morceaux.push(mot);
        mots.push(mot);
      } else if (choix < 7) {
        morceaux.push(LEGITIMES[hasard(LEGITIMES.length)]);
      } else {
        morceaux.push(nombreLong(hasard));
      }
    }
    return { texte: morceaux.join(" "), mots };
  }

  it("ne laisse jamais une suite de 8 chiffres ou plus, garde les mots, et ne change rien au second passage (600 textes)", () => {
    const hasard = generateur(20261014);
    for (let i = 0; i < 600; i++) {
      const { texte, mots } = texteAuHasard(hasard);
      const masque = masquerDonneesPersonnelles(texte);

      assert.ok(plusLongueSuiteDeChiffres(masque) < 8, `reste une suite de chiffres dans « ${masque} » (avant : « ${texte} »)`);
      for (const mot of mots) assert.ok(masque.includes(mot), `le mot « ${mot} » a disparu de « ${masque} » (avant : « ${texte} »)`);
      assert.equal(masquerDonneesPersonnelles(masque), masque, `le second passage change « ${masque} »`);
    }
  });

  it("garde les chiffres légitimes seuls, quel que soit leur ordre (200 textes)", () => {
    const hasard = generateur(72_61);
    for (let i = 0; i < 200; i++) {
      const morceaux: string[] = [];
      for (let j = 0; j < 3 + hasard(5); j++) morceaux.push(`${MOTS[hasard(MOTS.length)]} ${LEGITIMES[hasard(LEGITIMES.length)]}`);
      const texte = morceaux.join(", ");
      assert.equal(masquerDonneesPersonnelles(texte), texte);
    }
  });

  it("finit vite sur une très longue entrée hostile (espaces et chiffres alternés)", () => {
    const texte = "1 ".repeat(5_000) + " ".repeat(5_000) + "x";
    const debut = performance.now();
    const masque = masquerDonneesPersonnelles(texte);
    assert.ok(performance.now() - debut < 1_000, "le masque est trop lent");
    assert.ok(plusLongueSuiteDeChiffres(masque) < 8);
  });
});
