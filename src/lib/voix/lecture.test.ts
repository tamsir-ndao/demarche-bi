// Tests du texte que le téléphone lit à voix haute : tout vient de la fiche, rien n'est ajouté. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Fiche } from "../fiches/schema";
import {
  dateParlee,
  decouperPourLaVoix,
  pourLaVoix,
  preparerLaLecture,
  scriptFiche,
  scriptInconnue,
  scriptPrecision,
  scriptPrecisionGenerale,
} from "./lecture";

const FICHE: Fiche = {
  slug: "duplicata-carte-nationale-identite",
  titre: "Duplicata de la carte nationale d’identité",
  categorie: "identite",
  resume: "Établissement d’un duplicata en cas de perte, avec un certificat de perte et un timbre de 10 000 FCFA.",
  mots_cles: ["duplicata"],
  pieces: [
    "Un extrait de naissance (durée de validité à confirmer : moins d’1 an)",
    "Un certificat de perte, délivré par la police",
    "Un timbre de 10 000 FCFA",
  ],
  etapes: ["Se procurer un certificat de perte.", "Déposer la demande à la Section CNI."],
  cout: "Timbre de 10 000 FCFA",
  delai: null,
  lieu: "Section CNI du commissariat",
  sources: [{ titre: "Ministère", url: "https://www.interieur.gouv.sn/x", consulte_le: "2026-10-11" }],
  statut: "brouillon",
  verifie_le: null,
  verifie_par: null,
  corps: [
    "- Divergence entre deux pages : à confirmer auprès de la DAF (numéro vert 800 00 2012) avant de se déplacer.",
    "- Le délai de fabrication n’est pas indiqué.",
  ].join("\n"),
} as Fiche;

const BROUILLON = { type: "brouillon", libelle: "Brouillon, pas encore vérifiée" } as const;

describe("dateParlee", () => {
  it("écrit le mois en toutes lettres", () => {
    assert.equal(dateParlee("2026-10-14"), "14 octobre 2026");
    assert.equal(dateParlee("2026-02-03"), "3 février 2026");
    assert.equal(dateParlee("2026-12-31"), "31 décembre 2026");
  });
  it("connaît les douze mois", () => {
    const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    mois.forEach((nom, i) => assert.equal(dateParlee(`2026-${String(i + 1).padStart(2, "0")}-15`), `15 ${nom} 2026`));
  });
  it("dit « premier » pour le 1er du mois", () => {
    assert.equal(dateParlee("2026-03-01"), "premier mars 2026");
  });
  it("rend tel quel un texte qui n'est pas une date", () => {
    assert.equal(dateParlee("bientôt"), "bientôt");
    assert.equal(dateParlee("2026-13-01"), "2026-13-01");
  });
});

describe("pourLaVoix", () => {
  it("dit « francs CFA » à la place de FCFA", () => {
    assert.equal(pourLaVoix("Timbre de 10 000 FCFA"), "Timbre de 10000 francs CFA");
  });
  it("colle les chiffres d'un montant (espaces ordinaires et insécables) pour que chaque téléphone dise « dix mille »", () => {
    assert.equal(pourLaVoix("1 000 000 FCFA"), "1000000 francs CFA");
    assert.equal(pourLaVoix("200\u00a0FCFA, puis 10\u202f000 FCFA"), "200 francs CFA, puis 10000 francs CFA");
    assert.equal(pourLaVoix("10\u2009000 FCFA"), "10000 francs CFA");
  });
  it("ne colle pas des nombres séparés qui ne forment pas un montant", () => {
    assert.equal(pourLaVoix("Le 3 mars 2026, 12 personnes"), "Le 3 mars 2026, 12 personnes");
    assert.equal(pourLaVoix("pièces 1 2 3"), "pièces 1 2 3");
  });
  it("épelle un numéro vert par groupes de chiffres", () => {
    assert.equal(pourLaVoix("numéro vert 800 00 2012 avant"), "numéro vert 8 0 0, 0 0, 2 0 1 2 avant");
    assert.equal(pourLaVoix("Numéro vert : 800 00 2012."), "Numéro vert : 8 0 0, 0 0, 2 0 1 2.");
  });
  it("épelle aussi un numéro écrit sans accent ou avec l'indicatif du pays", () => {
    assert.equal(pourLaVoix("numero vert 800 00 2012"), "numero vert 8 0 0, 0 0, 2 0 1 2");
    assert.equal(pourLaVoix("Numéro vert +221 33 800 00 00."), "Numéro vert plus 2 2 1, 3 3, 8 0 0, 0 0, 0 0.");
  });
  it("ne colle pas les groupes d'un numéro de téléphone ordinaire ni une année suivie d'un nombre", () => {
    assert.equal(pourLaVoix("Appeler le 77 123 45 67"), "Appeler le 77 123 45 67");
    assert.equal(pourLaVoix("En 2026 100 personnes"), "En 2026 100 personnes");
    assert.equal(pourLaVoix("de 12 15 personnes"), "de 12 15 personnes");
  });
  it("n'épelle pas un montant qui suit un autre mot", () => {
    assert.equal(pourLaVoix("un timbre de 800 FCFA"), "un timbre de 800 francs CFA");
  });
  it("dit « numéro » à la place de n°", () => {
    assert.equal(pourLaVoix("le n° 5 et le N° 7"), "le numéro 5 et le numéro 7");
  });
  it("retire les guillemets et remplace les tirets longs et « & »", () => {
    assert.equal(pourLaVoix("la page « Duplicata » — voir ici & là"), "la page Duplicata, voir ici et là");
  });
  it("remplace les parenthèses par des virgules, sans virgule en trop", () => {
    assert.equal(pourLaVoix("Pointe-Noire (Congo)."), "Pointe-Noire, Congo.");
    assert.equal(pourLaVoix("Un extrait (moins d’1 an) et un acte"), "Un extrait, moins d’1 an, et un acte");
  });
  it("range les virgules : pas d'espace avant, pas de virgule double, ni au début ni à la fin", () => {
    assert.equal(pourLaVoix("a , b"), "a, b");
    assert.equal(pourLaVoix("Pointe-Noire (Congo), Paris"), "Pointe-Noire, Congo, Paris");
    assert.equal(pourLaVoix("(Congo) est un pays"), "Congo, est un pays");
    assert.equal(pourLaVoix("Pointe-Noire (Congo)"), "Pointe-Noire, Congo");
  });
  it("ramène les espaces insécables et multiples à une espace", () => {
    assert.equal(pourLaVoix("Quelle\u00a0démarche  te   bloque\u00a0?"), "Quelle démarche te bloque ?");
  });
  it("ne change pas un texte simple", () => {
    assert.equal(pourLaVoix("Je ne sais pas encore."), "Je ne sais pas encore.");
  });
});

describe("decouperPourLaVoix", () => {
  it("coupe aux fins de phrase", () => {
    assert.deepEqual(decouperPourLaVoix("Première phrase. Deuxième phrase ? Troisième !"), [
      "Première phrase.",
      "Deuxième phrase ?",
      "Troisième !",
    ]);
  });
  it("coupe aux lignes", () => {
    assert.deepEqual(decouperPourLaVoix("Coût.\n10000 francs CFA."), ["Coût.", "10000 francs CFA."]);
  });
  it("ne garde pas de morceau vide", () => {
    assert.deepEqual(decouperPourLaVoix("  \n Bonjour.  \n\n  "), ["Bonjour."]);
    assert.deepEqual(decouperPourLaVoix(""), []);
  });
  it("coupe une phrase trop longue à une virgule ou un point-virgule, pas au milieu d'un mot", () => {
    const longue = `${"mot ".repeat(30)}fin, ${"autre ".repeat(30)}fin; ${"dernier ".repeat(20)}fin.`;
    const morceaux = decouperPourLaVoix(longue, 200);
    assert.ok(morceaux.length >= 3);
    for (const morceau of morceaux) assert.ok(morceau.length <= 200, `trop long : ${morceau.length}`);
    assert.equal(morceaux.join(" ").replace(/\s+/g, " "), longue.replace(/\s+/g, " ").trim());
  });
  it("coupe une phrase trop longue à la virgule et au point-virgule eux-mêmes", () => {
    const longue = `${"mot ".repeat(30)}fin, ${"autre ".repeat(30)}fin; ${"dernier ".repeat(20)}fin.`;
    const morceaux = decouperPourLaVoix(longue, 200);
    assert.ok(morceaux[0].endsWith("fin,"), morceaux[0].slice(-10));
    assert.ok(morceaux[1].endsWith("fin;"), morceaux[1].slice(-10));
  });
  it("garde des morceaux de 200 caractères au plus quand on ne précise pas la limite", () => {
    const longue = `${"mot ".repeat(40)}fin, ${"autre ".repeat(40)}fin.`;
    const morceaux = decouperPourLaVoix(longue);
    assert.ok(morceaux.length >= 2);
    for (const morceau of morceaux) assert.ok(morceau.length <= 200, `trop long : ${morceau.length}`);
  });
  it("coupe aussi aux lignes qui ne finissent pas par un point", () => {
    assert.deepEqual(decouperPourLaVoix("Titre sans point\nAutre ligne"), ["Titre sans point", "Autre ligne"]);
  });
  it("coupe à une espace quand il n'y a aucune virgule", () => {
    const sansVirgule = "mot ".repeat(120).trim() + ".";
    const morceaux = decouperPourLaVoix(sansVirgule, 100);
    for (const morceau of morceaux) assert.ok(morceau.length <= 100);
    assert.equal(morceaux.join(" "), sansVirgule);
  });
  it("coupe un mot plus long que la limite plutôt que de boucler", () => {
    const morceaux = decouperPourLaVoix("x".repeat(250), 100);
    assert.deepEqual(morceaux.map((m) => m.length), [100, 100, 50]);
  });
});

describe("scriptFiche", () => {
  const script = scriptFiche({ fiche: FICHE, statut: BROUILLON, intro: "Pour un duplicata, va à la Section CNI." });
  const texte = script.join("\n");

  it("commence par prévenir qu'une fiche n'est pas vérifiée", () => {
    assert.equal(script[0], "Attention, cette fiche n’est pas encore vérifiée.");
  });
  it("dit ensuite le titre, puis l'introduction écrite par l'IA en le signalant", () => {
    assert.equal(script[1], "Duplicata de la carte nationale d’identité.");
    assert.equal(script[2], "Pour un duplicata, va à la Section CNI.");
    assert.equal(script[3], "Cette phrase est écrite par l’IA, d’après la fiche.");
  });
  it("lit le résumé de la fiche quand l'IA n'a pas écrit d'introduction, sans la signaler", () => {
    const sansIntro = scriptFiche({ fiche: FICHE, statut: BROUILLON, intro: null }).join("\n");
    assert.ok(sansIntro.includes("Établissement d’un duplicata en cas de perte"));
    assert.ok(!sansIntro.includes("écrite par l’IA"));
  });
  it("dit le coût, le délai et le lieu tels que la fiche les donne, et « non précisé » sinon", () => {
    assert.ok(script.includes("Coût : Timbre de 10 000 FCFA."));
    assert.ok(script.includes("Délai : non précisé, la source ne le dit pas."));
    assert.ok(script.includes("Où : Section CNI du commissariat."));
  });
  it("lit chaque note « à confirmer » de la fiche, pas les autres notes", () => {
    assert.ok(texte.includes("À confirmer. Divergence entre deux pages : à confirmer auprès de la DAF (numéro vert 800 00 2012) avant de se déplacer."));
    assert.ok(!texte.includes("Le délai de fabrication n’est pas indiqué"));
  });
  it("lit chaque pièce telle que la fiche la donne, avec sa précision et son « à confirmer »", () => {
    assert.ok(script.includes("Ce qu’il faut apporter."));
    assert.ok(script.includes("Un extrait de naissance (durée de validité à confirmer : moins d’1 an)."));
    assert.ok(script.includes("Un certificat de perte, délivré par la police."));
    assert.ok(script.includes("Un timbre de 10 000 FCFA."));
  });
  it("numérote les étapes", () => {
    assert.ok(script.includes("Les étapes."));
    assert.ok(script.includes("Étape 1. Se procurer un certificat de perte."));
    assert.ok(script.includes("Étape 2. Déposer la demande à la Section CNI."));
  });
  it("finit par l'avertissement du site, sans rien ajouter après", () => {
    assert.equal(script.at(-1), "Information indicative, à vérifier avant de te déplacer.");
  });
  it("dit la date d'une fiche vérifiée, avec le mois en toutes lettres", () => {
    const verifiee = { ...FICHE, statut: "verifie", verifie_le: "2026-10-14" } as Fiche;
    const s = scriptFiche({ fiche: verifiee, statut: { type: "verifie", libelle: "Vérifié le 14 oct. 2026" }, intro: null });
    assert.equal(s[0], "Fiche vérifiée le 14 octobre 2026.");
  });
  it("prévient quand la vérification date de plus d'un an", () => {
    const vieille = { ...FICHE, statut: "verifie", verifie_le: "2024-01-05" } as Fiche;
    const s = scriptFiche({ fiche: vieille, statut: { type: "perimee", libelle: "Vérifié il y a plus d’un an" }, intro: null });
    assert.equal(s[0], "Attention, cette fiche a été vérifiée il y a plus d’un an.");
  });
  it("saute les parties que la fiche n'a pas (aucune pièce, aucune note à confirmer)", () => {
    const nue = { ...FICHE, pieces: [], corps: "" } as Fiche;
    const s = scriptFiche({ fiche: nue, statut: BROUILLON, intro: null }).join("\n");
    assert.ok(!s.includes("Ce qu’il faut apporter"));
    assert.ok(!s.includes("À confirmer."));
    assert.ok(s.includes("Les étapes."));
  });
});

describe("autres réponses", () => {
  it("dit « je ne sais pas » sans rien inventer", () => {
    assert.deepEqual(scriptInconnue(), [
      "Je ne sais pas encore.",
      "Je n’ai pas de source officielle pour ça. Je préfère te le dire plutôt que d’inventer.",
    ]);
  });
  it("pose la question de précision et liste les démarches possibles", () => {
    assert.deepEqual(scriptPrecision({ question: "Quelle carte veux-tu ?", options: [{ titre: "Duplicata" }, { titre: "Première carte" }] }), [
      "Quelle carte veux-tu ?",
      "Choisis une démarche à l’écran : Duplicata ; Première carte ; ou autre chose.",
    ]);
  });
  it("pose une question par défaut quand le modèle n'en a pas écrit", () => {
    assert.equal(scriptPrecision({ question: "", options: [{ titre: "A" }] })[0], "Que veux-tu faire ?");
    assert.equal(scriptPrecisionGenerale({ question: "" })[0], "Peux-tu préciser ta question ?");
  });
  it("demande un détail quand la question est trop vague", () => {
    assert.deepEqual(scriptPrecisionGenerale({ question: "De quelle carte parles-tu ?" }), [
      "De quelle carte parles-tu ?",
      "Ajoute un détail, et je te réponds.",
    ]);
  });
});

describe("preparerLaLecture", () => {
  it("prépare chaque paragraphe pour la voix puis le coupe en morceaux courts", () => {
    assert.deepEqual(preparerLaLecture(["Coût : Timbre de 10 000 FCFA.", "Étape 1. Aller à Pointe-Noire (Congo)."]), [
      "Coût : Timbre de 10000 francs CFA.",
      "Étape 1.",
      "Aller à Pointe-Noire, Congo.",
    ]);
  });
  it("ne rend rien pour une réponse vide", () => {
    assert.deepEqual(preparerLaLecture([]), []);
    assert.deepEqual(preparerLaLecture(["", "  "]), []);
  });
});
