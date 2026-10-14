// Tests des garde-fous : l'introduction écrite par le modèle n'est montrée que si elle reste fidèle à la fiche.
// Lancer : npm test
// La fiche ci-dessous est une donnée FICTIVE de test.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ficheDeTest } from "./fiche-de-test";
import {
  estDemandeFrauduleuse,
  extraireNombres,
  motsAbsolusNonPermis,
  ressembleAUneDemarche,
  verifierIntro,
  verifierMessageSansReponse,
} from "./guardrails";

const fiche = ficheDeTest({
  slug: "carte",
  titre: "Carte d'identité de test",
  resume: "Demande de la carte, valable 10 ans, pour toute personne d'au moins 5 ans.",
  pieces: ["Un extrait de naissance de moins de 3 mois", "Un timbre de 10 000 FCFA"],
  etapes: [
    "Se rendre au commissariat de police.",
    "Déposer la demande avec les pièces.",
    "Retirer la carte sur présentation du récépissé.",
  ],
  cout: "Timbre de 10 000 FCFA",
  delai: "3 à 5 jours",
  lieu: "Commissariat de police",
  corps: "- Pour confirmer, appeler le numéro vert 800 00 2012.",
});

const introValide = "Tu peux faire ta carte dès 5 ans. Elle coûte un timbre de 10 000 FCFA.";

/** La raison du rejet, ou `null` quand l'introduction est acceptée. */
function raison(intro: string, options?: { slugs?: string[] }): string | null {
  const verdict = verifierIntro(intro, fiche, options);
  return verdict.ok ? null : verdict.raison;
}

describe("extraireNombres", () => {
  it("lit les nombres quelle que soit la façon d'écrire les milliers", () => {
    assert.deepEqual(extraireNombres("10 000 FCFA"), ["10000"]);
    assert.deepEqual(extraireNombres("10\u00a0000 FCFA"), ["10000"]);
    assert.deepEqual(extraireNombres("10.000 FCFA"), ["10000"]);
    assert.deepEqual(extraireNombres("10000 FCFA"), ["10000"]);
  });

  it("garde les décimales et distingue 2,5 de 25", () => {
    assert.deepEqual(extraireNombres("2,5 jours"), ["2.5"]);
    assert.deepEqual(extraireNombres("25 jours"), ["25"]);
  });

  it("lit chaque nombre d'une phrase", () => {
    assert.deepEqual(extraireNombres("de 3 à 5 jours, 10 ans"), ["3", "5", "10"]);
    assert.deepEqual(extraireNombres("numéro vert 800 00 2012"), ["800", "00", "2012"]);
  });

  it("renvoie une liste vide sans chiffre", () => {
    assert.deepEqual(extraireNombres("aucun nombre ici"), []);
  });
});

describe("motsAbsolusNonPermis", () => {
  it("donne les mots absolus du texte que la fiche n'emploie pas, tels qu'écrits, une seule fois", () => {
    assert.deepEqual(motsAbsolusNonPermis("C'est gratuit ? Toujours gratuit ? Seule la carte compte.", fiche), [
      "gratuit",
      "toujours",
      "seule",
    ]);
  });

  it("ne donne rien quand le texte n'en contient pas", () => {
    assert.deepEqual(motsAbsolusNonPermis("Combien coûte la carte ?", fiche), []);
  });

  it("ne donne pas un mot absolu que la fiche emploie, à l'accord près", () => {
    const stricte = ficheDeTest({ slug: "stricte", titre: "Démarche stricte", resume: "Démarche gratuite." });
    assert.deepEqual(motsAbsolusNonPermis("C'est gratuit ?", stricte), []);
  });

  it("ne confond pas un mot absolu avec un mot qui le contient", () => {
    assert.deepEqual(motsAbsolusNonPermis("Et à la Toussaint ?", fiche), []);
  });
});

describe("verifierIntro", () => {
  it("accepte une introduction fidèle à la fiche", () => {
    assert.deepEqual(verifierIntro(introValide, fiche), { ok: true, intro: introValide });
  });

  it("accepte une introduction sans aucun chiffre", () => {
    assert.equal(raison("Tu dois aller au commissariat de police."), null);
  });

  it("nettoie les espaces et remplace les traits d'union insécables", () => {
    const verdict = verifierIntro("  Rends\u2011toi   au commissariat.  ", fiche);
    assert.deepEqual(verdict, { ok: true, intro: "Rends-toi au commissariat." });
  });

  it("rejette une introduction vide ou trop longue", () => {
    assert.match(raison("   ") ?? "", /vide ou trop longue/);
    assert.match(raison(`Tu peux ${"faire ta carte ".repeat(40)}.`) ?? "", /vide ou trop longue/);
  });

  it("rejette un montant qui n'est pas dans la fiche", () => {
    assert.match(raison("Elle coûte un timbre de 12 000 FCFA.") ?? "", /nombre/i);
  });

  it("accepte un montant écrit autrement que dans la fiche", () => {
    assert.equal(raison("Elle coûte un timbre de 10000 FCFA."), null);
    assert.equal(raison("Elle coûte un timbre de 10.000 FCFA."), null);
  });

  it("rejette un nombre qui n'est pas dans la fiche, même sans montant", () => {
    assert.match(raison("Ton fils de 8 ans peut avoir sa carte.") ?? "", /nombre « 8 »/i);
  });

  it("rejette un nombre écrit en toutes lettres qui n'est pas dans la fiche", () => {
    assert.match(raison("Compte quatre jours d'attente.") ?? "", /nombre « quatre »/i);
  });

  it("accepte un nombre écrit en toutes lettres quand la fiche le donne en chiffres", () => {
    assert.equal(raison("Compte entre trois et cinq jours d'attente."), null);
  });

  it("rejette un mot absolu que la fiche n'emploie pas", () => {
    assert.match(raison("C'est la seule pièce demandée.") ?? "", /« seule »/);
    assert.match(raison("Cette démarche est gratuite.") ?? "", /« gratuite »/);
    assert.match(raison("Tu dois toujours venir avec ton extrait.") ?? "", /« toujours »/);
    assert.match(raison("Il faut impérativement un timbre, uniquement en espèces.") ?? "", /« uniquement »/);
  });

  it("accepte un mot absolu quand la fiche l'emploie aussi", () => {
    const stricte = ficheDeTest({
      slug: "stricte",
      titre: "Démarche stricte",
      resume: "Démarche gratuite, uniquement pour les adultes.",
    });
    assert.deepEqual(verifierIntro("C'est gratuit, mais uniquement pour les adultes.", stricte).ok, true);
  });

  it("explique le refus au modèle", () => {
    assert.equal(
      raison("Ton fils peut aller seul au commissariat de police."),
      "Mot absolu « seul » absent de la fiche : ne le reprends pas, même pour dire le contraire. Dis ce que la fiche indique.",
    );
  });

  it("ne confond pas un mot absolu avec un mot qui le contient", () => {
    assert.equal(raison("Compte un jour de plus quand la Toussaint tombe pendant l'attente."), null);
  });

  it("rejette une adresse web ou une adresse e-mail", () => {
    assert.match(raison("Va sur https://exemple.sn pour faire ta demande.") ?? "", /adresse/i);
    assert.match(raison("Va sur www.exemple.sn pour faire ta demande.") ?? "", /adresse/i);
    assert.match(raison("Écris à contact@exemple.sn.") ?? "", /adresse/i);
    assert.match(raison("Rends-toi sur interieur.gouv.sn pour faire ta demande.") ?? "", /adresse/i);
  });

  it("rejette du balisage", () => {
    assert.match(raison("Tu peux faire **ta carte** dès 5 ans.") ?? "", /balisage/i);
    assert.match(raison("Tu peux faire <b>ta carte</b> dès 5 ans.") ?? "", /balisage/i);
  });

  it("rejette un identifiant interne de fiche", () => {
    const rejet = raison("Voir la fiche casier-judiciaire pour plus de détails.", { slugs: ["casier-judiciaire", "ninea"] });
    assert.match(rejet ?? "", /identifiant/i);
  });

  it("ne prend pas un simple mot pour un identifiant interne", () => {
    assert.equal(raison("Le ninea n'est pas utile ici.", { slugs: ["ninea"] }), null);
  });
});

describe("verifierMessageSansReponse", () => {
  const horsDomaine = "Les recettes de cuisine, ce n’est pas mon domaine. Je t’aide pour les démarches administratives au Sénégal.";
  const verifier = (message: string, options?: { slugs?: string[] }) => verifierMessageSansReponse(message, options);

  it("accepte une phrase polie qui reprend le sujet, et la rend nettoyée", () => {
    assert.equal(verifier(horsDomaine), horsDomaine);
    assert.equal(verifier("  Je n’ai pas encore\n de source pour le visa. "), "Je n’ai pas encore de source pour le visa.");
  });
  it("refuse un message vide, ou trop long pour une ou deux phrases", () => {
    assert.equal(verifier(""), null);
    assert.equal(verifier("   "), null);
    assert.equal(verifier("mot ".repeat(60)), null);
  });
  it("refuse le balisage, les adresses web et les identifiants internes", () => {
    assert.equal(verifier("**Ce n’est pas mon domaine.**"), null);
    assert.equal(verifier("Regarde <b>ici</b>."), null);
    assert.equal(verifier("Va sur www.exemple.sn pour ça."), null);
    assert.equal(verifier("Écris à aide@exemple.sn."), null);
    assert.equal(verifier("Je n’ai pas encore la fiche permis-de-conduire.", { slugs: ["permis-de-conduire"] }), null);
  });
  it("refuse tout chiffre, même celui que la question contenait : le message ne donne aucune information administrative", () => {
    assert.equal(verifier("Le visa coûte 50 000 FCFA."), null);
    assert.equal(verifier("Ça se fait en 3 jours."), null);
    assert.equal(verifier("Je n’ai rien sur 5000."), null);
  });
  it("refuse un nombre écrit en lettres et un montant en francs", () => {
    assert.equal(verifier("Ça coûte dix mille francs."), null);
    assert.equal(verifier("Prévois deux semaines."), null);
    assert.equal(verifier("Il faut payer en francs CFA."), null);
    assert.equal(verifier("Le montant est en FCFA."), null);
  });
  it("accepte « un » et « une » (articles) et le mot « français »", () => {
    assert.equal(verifier("Je n’ai pas encore de source pour un visa français."), "Je n’ai pas encore de source pour un visa français.");
  });
});

describe("ressembleAUneDemarche", () => {
  it("reconnaît les mots d'une démarche, avec ou sans accents, au singulier ou au pluriel", () => {
    for (const question of [
      "Comment renouveler mon permis de conduire ?",
      "Comment faire ma carte grise ?",
      "Quelles pièces pour un acte de naissance ?",
      "Dama bëgg sama carte d'identité, naka laa ko defe ?",
      "C'est quoi le NINEA ?",
      "Où payer mes impôts ?",
      "Je cherche un certificat de nationalité",
      "OÙ LÉGALISER DES DOCUMENTS",
      "Comment créer une entreprise ?",
      "Où se trouve le commissariat ?",
    ]) {
      assert.equal(ressembleAUneDemarche(question), true, question);
    }
  });
  it("ne prend pas pour une démarche un sujet sans rapport", () => {
    for (const question of [
      "Comment faire du thiéboudienne ?",
      "Qui va gagner le match de ce soir ?",
      "Raconte-moi une blague",
      "Quel temps fait-il demain ?",
      "Comment obtenir un visa pour la France ?",
      "Bonjour, ça va ?",
    ]) {
      assert.equal(ressembleAUneDemarche(question), false, question);
    }
  });
  it("ne prend pas un mot pour le début d'un autre (« cartographie » n'est pas une carte)", () => {
    assert.equal(ressembleAUneDemarche("Montre-moi la cartographie de Dakar"), false);
    assert.equal(ressembleAUneDemarche("la sacte"), false);
  });
});

describe("estDemandeFrauduleuse", () => {
  it("détecte les demandes de faux documents, falsification, corruption et pratiques illégales", () => {
    for (const question of [
      "Comment fabriquer un faux passeport à Dakar ?",
      "Comment obtenir une fausse carte d'identité ?",
      "Où trouver de faux papiers ?",
      "Comment falsifier un extrait de naissance ?",
      "Comment truquer les résultats du permis de conduire ?",
      "Comment corrompre un agent pour passer le permis ?",
      "Payer un pot-de-vin à la police",
      "Donner un tchoko pour éviter l'amende",
      "Payer un bakchich au commissariat",
      "Comment faire pour frauder la douane ?",
      "Comment usurper l'identité de quelqu'un ?",
      "Acheter le permis sans passer l'examen",
      "Comment avoir des fausses plaques d'immatriculation ?",
      "Obtenir un document de manière illégale",
    ]) {
      assert.equal(estDemandeFrauduleuse(question), true, question);
    }
  });

  it("ne prend pas pour une fraude une démarche légale normale", () => {
    for (const question of [
      "Comment renouveler mon permis de conduire ?",
      "J'ai perdu mon passeport, comment avoir un duplicata ?",
      "Quelles pièces pour un extrait de naissance ?",
      "Comment dédouaner un véhicule importé ?",
      "Où se trouve le commissariat de police de Thiès ?",
      "Combien coûte le timbre fiscal de la carte d'identité ?",
    ]) {
      assert.equal(estDemandeFrauduleuse(question), false, question);
    }
  });
});
