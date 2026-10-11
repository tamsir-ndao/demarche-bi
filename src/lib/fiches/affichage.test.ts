// Tests de la préparation des fiches pour l'affichage. Lancer : npm test
// Les fiches ci-dessous sont des données FICTIVES de test : elles ne contiennent aucune information
// administrative réelle et ne doivent jamais aller dans content/.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORIES, type Fiche } from "./schema";
import {
  brouillonsAutorises,
  decouperPiece,
  decouperTelephones,
  domaine,
  estAConfirmer,
  filtrerAffichables,
  formaterDate,
  fichePourAffichage,
  libelleCategorie,
  notesDeLaFiche,
  resumeCoutDelai,
  resumeSources,
  statutAffichage,
} from "./affichage";

function fiche(overrides: Partial<Fiche> = {}): Fiche {
  return {
    slug: "demarche-test",
    titre: "Démarche de test",
    categorie: "autre",
    resume: "Résumé de test sans information administrative réelle.",
    mots_cles: ["test", "exemple", "fictif"],
    pieces: [],
    etapes: ["Étape de test"],
    cout: null,
    delai: null,
    lieu: null,
    sources: [{ titre: "Source de test", url: "https://example.org", consulte_le: "2026-10-11" }],
    statut: "verifie",
    verifie_le: "2026-10-14",
    verifie_par: "testeur",
    corps: "",
    ...overrides,
  };
}

describe("formaterDate", () => {
  it("écrit une date ISO en français abrégé", () => {
    assert.equal(formaterDate("2026-10-14"), "14 oct. 2026");
  });

  it("n'ajoute pas de zéro devant le jour", () => {
    assert.equal(formaterDate("2026-03-05"), "5 mars 2026");
  });

  it("écrit 1er pour le premier jour du mois", () => {
    assert.equal(formaterDate("2026-03-01"), "1er mars 2026");
  });

  it("abrège chaque mois comme en français", () => {
    const attendus = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    attendus.forEach((mois, i) => {
      assert.equal(formaterDate(`2026-${String(i + 1).padStart(2, "0")}-10`), `10 ${mois} 2026`);
    });
  });

  it("renvoie le texte tel quel s'il n'est pas une date", () => {
    assert.equal(formaterDate("bientôt"), "bientôt");
  });
});

describe("libelleCategorie", () => {
  it("donne un nom lisible, avec accents", () => {
    assert.equal(libelleCategorie("identite"), "Identité");
    assert.equal(libelleCategorie("etat-civil"), "État civil");
  });

  it("couvre toutes les catégories autorisées par le schéma", () => {
    for (const categorie of CATEGORIES) {
      assert.ok(libelleCategorie(categorie).length > 0, `libellé manquant : ${categorie}`);
    }
  });
});

describe("statutAffichage", () => {
  const maintenant = new Date("2026-10-20T10:00:00Z");

  it("affiche la date de vérification d'une fiche vérifiée", () => {
    assert.deepEqual(statutAffichage(fiche({ verifie_le: "2026-10-14" }), maintenant), {
      type: "verifie",
      libelle: "Vérifié le 14 oct. 2026",
    });
  });

  it("signale une vérification de plus d'un an", () => {
    assert.deepEqual(statutAffichage(fiche({ verifie_le: "2025-09-01" }), maintenant), {
      type: "perimee",
      libelle: "Vérifié il y a plus d’un an",
    });
  });

  it("affiche « Brouillon » pour une fiche non vérifiée, sans date", () => {
    assert.deepEqual(statutAffichage(fiche({ statut: "brouillon", verifie_le: null, verifie_par: null }), maintenant), {
      type: "brouillon",
      libelle: "Brouillon, pas encore vérifiée",
    });
  });

  it("n'affiche jamais « Vérifié » pour un brouillon, même avec une date d'exemple", () => {
    const statut = statutAffichage(fiche({ statut: "brouillon", verifie_le: "2026-10-14" }), maintenant);
    assert.equal(statut.type, "brouillon");
  });

  it("traite comme un brouillon une fiche dite vérifiée mais sans date", () => {
    const statut = statutAffichage(fiche({ statut: "verifie", verifie_le: null }), maintenant);
    assert.equal(statut.type, "brouillon");
  });
});

describe("filtrerAffichables", () => {
  const verifiee = fiche({ slug: "verifiee" });
  const brouillon = fiche({ slug: "brouillon", statut: "brouillon", verifie_le: null, verifie_par: null });

  it("garde seulement les fiches vérifiées par défaut", () => {
    assert.deepEqual(filtrerAffichables([verifiee, brouillon], false).map((f) => f.slug), ["verifiee"]);
  });

  it("garde aussi les brouillons quand ils sont autorisés (développement)", () => {
    assert.deepEqual(filtrerAffichables([verifiee, brouillon], true).map((f) => f.slug), ["verifiee", "brouillon"]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const liste = [verifiee, brouillon];
    filtrerAffichables(liste, false);
    assert.equal(liste.length, 2);
  });
});

describe("resumeCoutDelai", () => {
  it("dit que le coût et le délai ne sont pas précisés quand les deux valent null", () => {
    assert.equal(resumeCoutDelai(fiche({ cout: null, delai: null })), "Coût et délai non précisés");
  });

  it("ne devine pas le délai manquant", () => {
    assert.equal(resumeCoutDelai(fiche({ cout: "Montant de test", delai: null })), "Montant de test · délai non précisé");
  });

  it("ne devine pas le coût manquant", () => {
    assert.equal(resumeCoutDelai(fiche({ cout: null, delai: "2 jours" })), "Coût non précisé · 2 jours");
  });

  it("met le délai en minuscules après le coût", () => {
    assert.equal(resumeCoutDelai(fiche({ cout: "200 FCFA", delai: "Un jour" })), "200 FCFA · un jour");
    assert.equal(resumeCoutDelai(fiche({ cout: "200 FCFA", delai: "Environ 3 jours" })), "200 FCFA · environ 3 jours");
  });

  it("laisse intact un délai qui commence par un sigle", () => {
    assert.equal(resumeCoutDelai(fiche({ cout: "200 FCFA", delai: "SMS sous 3 jours" })), "200 FCFA · SMS sous 3 jours");
  });
});

describe("notesDeLaFiche", () => {
  it("lit les puces du texte libre, une note par puce", () => {
    assert.deepEqual(notesDeLaFiche("- Première note.\n- Deuxième note."), ["Première note.", "Deuxième note."]);
  });

  it("accepte aussi les puces à étoile et ignore les lignes vides", () => {
    assert.deepEqual(notesDeLaFiche("* Une note\n\n* Autre note\n"), ["Une note", "Autre note"]);
  });

  it("ignore les lignes qui ne sont pas des puces", () => {
    assert.deepEqual(notesDeLaFiche("Texte libre\n- Une note\n## Titre"), ["Une note"]);
  });

  it("renvoie une liste vide quand il n'y a pas de texte libre", () => {
    assert.deepEqual(notesDeLaFiche(""), []);
  });
});

describe("estAConfirmer", () => {
  it("repère « à confirmer », avec ou sans accent et quelle que soit la casse", () => {
    assert.equal(estAConfirmer("Durée de validité À confirmer auprès du guichet."), true);
    assert.equal(estAConfirmer("montant a confirmer"), true);
  });

  it("ne se déclenche pas sur un texte qui ne parle pas de confirmation", () => {
    assert.equal(estAConfirmer("Le délai n'est pas indiqué."), false);
    assert.equal(estAConfirmer("Il va confirmer sa venue."), false);
  });
});

describe("decouperPiece", () => {
  it("sépare la précision entre parenthèses et repère « à confirmer »", () => {
    assert.deepEqual(decouperPiece("Un extrait de test (durée de validité à confirmer : moins d'un an)"), {
      principal: "Un extrait de test",
      precision: "durée de validité à confirmer : moins d'un an",
      aConfirmer: true,
    });
  });

  it("garde une pièce sans parenthèses en un seul morceau", () => {
    assert.deepEqual(decouperPiece("Un timbre de test"), {
      principal: "Un timbre de test",
      precision: null,
      aConfirmer: false,
    });
  });

  it("ne coupe pas une parenthèse placée au milieu du texte", () => {
    assert.deepEqual(decouperPiece("Photo (4x4) récente"), {
      principal: "Photo (4x4) récente",
      precision: null,
      aConfirmer: false,
    });
  });

  it("garde la précision sans marquer « à confirmer » quand elle n'en parle pas", () => {
    assert.deepEqual(decouperPiece("Un certificat (original)"), {
      principal: "Un certificat",
      precision: "original",
      aConfirmer: false,
    });
  });
});

describe("domaine", () => {
  it("garde le nom de domaine sans « www. »", () => {
    assert.equal(domaine("https://www.exemple.sn/services/x"), "exemple.sn");
    assert.equal(domaine("https://example.org"), "example.org");
  });

  it("renvoie le texte tel quel quand ce n'est pas une adresse", () => {
    assert.equal(domaine("pas une adresse"), "pas une adresse");
  });
});

describe("resumeSources", () => {
  const source = (url: string, consulte_le: string) => ({ titre: "Source de test", url, consulte_le });

  it("résume une seule source avec son domaine et sa date de consultation", () => {
    assert.deepEqual(resumeSources([source("https://www.example.org/a", "2026-10-11")]), {
      titre: "Source officielle",
      detail: "example.org, consultée le 11 oct. 2026",
    });
  });

  it("met au pluriel et ne répète pas le domaine quand les sources ont la même date", () => {
    assert.deepEqual(
      resumeSources([source("https://example.org/a", "2026-10-11"), source("https://example.org/b", "2026-10-11")]),
      { titre: "Sources officielles", detail: "example.org, consultées le 11 oct. 2026" },
    );
  });

  it("liste les domaines et laisse les dates au détail quand elles diffèrent", () => {
    assert.deepEqual(
      resumeSources([source("https://example.org/a", "2026-10-11"), source("https://exemple.sn/b", "2026-10-12")]),
      { titre: "Sources officielles", detail: "example.org, exemple.sn" },
    );
  });
});

describe("decouperTelephones", () => {
  it("transforme un numéro vert en lien d'appel", () => {
    assert.deepEqual(decouperTelephones("Appelle le numéro vert 800 00 2012 avant d’y aller."), [
      { type: "texte", valeur: "Appelle le numéro vert " },
      { type: "tel", valeur: "800 00 2012", href: "tel:800002012" },
      { type: "texte", valeur: " avant d’y aller." },
    ]);
  });

  it("laisse intact un texte sans numéro", () => {
    assert.deepEqual(decouperTelephones("Rien à appeler ici."), [{ type: "texte", valeur: "Rien à appeler ici." }]);
  });

  it("ne prend pas un montant pour un numéro de téléphone", () => {
    assert.deepEqual(decouperTelephones("Caution de 1 000 000 FCFA"), [{ type: "texte", valeur: "Caution de 1 000 000 FCFA" }]);
  });

  it("ne lie que les numéros annoncés comme numéro vert", () => {
    assert.deepEqual(decouperTelephones("Appelle le 800 00 2012."), [{ type: "texte", valeur: "Appelle le 800 00 2012." }]);
  });

  it("garde le point final hors du lien", () => {
    const segments = decouperTelephones("Numéro vert : 800 00 2012.");
    assert.deepEqual(segments.at(-2), { type: "tel", valeur: "800 00 2012", href: "tel:800002012" });
    assert.deepEqual(segments.at(-1), { type: "texte", valeur: "." });
  });
});

describe("brouillonsAutorises", () => {
  it("n'autorise les brouillons que si DEMARCHE_INCLUDE_DRAFTS vaut exactement « true »", () => {
    assert.equal(brouillonsAutorises({ DEMARCHE_INCLUDE_DRAFTS: "true" }), true);
    assert.equal(brouillonsAutorises({ DEMARCHE_INCLUDE_DRAFTS: "false" }), false);
    assert.equal(brouillonsAutorises({ DEMARCHE_INCLUDE_DRAFTS: "1" }), false);
    assert.equal(brouillonsAutorises({}), false);
  });
});

describe("fichePourAffichage", () => {
  const brute = fiche({
    titre: "Carte d'identité de test",
    resume: "Résumé de l'exemple, sans information réelle.",
    mots_cles: ["carte d'identité", "exemple", "fictif"],
    pieces: ["L'acte de test"],
    etapes: ["Déposer l'exemple"],
    cout: "Coût d'exemple",
    delai: "Délai d'exemple",
    lieu: "Lieu d'exemple",
    sources: [{ titre: "Page d'exemple", url: "https://example.org/l'exemple", consulte_le: "2026-10-11" }],
    corps: "- Note d'exemple.",
  });
  const affichee = fichePourAffichage(brute);

  it("met l'apostrophe typographique dans tous les textes montrés à l'écran", () => {
    assert.equal(affichee.titre, "Carte d’identité de test");
    assert.equal(affichee.resume, "Résumé de l’exemple, sans information réelle.");
    assert.deepEqual(affichee.pieces, ["L’acte de test"]);
    assert.deepEqual(affichee.etapes, ["Déposer l’exemple"]);
    assert.equal(affichee.cout, "Coût d’exemple");
    assert.equal(affichee.delai, "Délai d’exemple");
    assert.equal(affichee.lieu, "Lieu d’exemple");
    assert.equal(affichee.sources[0].titre, "Page d’exemple");
    assert.equal(affichee.corps, "- Note d’exemple.");
  });

  it("garde null quand la fiche ne dit rien", () => {
    const vide = fichePourAffichage(fiche({ cout: null, delai: null, lieu: null }));
    assert.deepEqual([vide.cout, vide.delai, vide.lieu], [null, null, null]);
  });

  it("ne modifie ni les adresses, ni les mots-clés de la recherche, ni l'identifiant", () => {
    assert.equal(affichee.sources[0].url, "https://example.org/l'exemple");
    assert.deepEqual(affichee.mots_cles, ["carte d'identité", "exemple", "fictif"]);
    assert.equal(affichee.slug, brute.slug);
  });

  it("ne modifie pas la fiche d'origine", () => {
    assert.equal(brute.titre, "Carte d'identité de test");
  });
});
