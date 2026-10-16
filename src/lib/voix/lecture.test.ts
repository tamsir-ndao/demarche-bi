// Tests du texte que le téléphone lit à voix haute : tout vient de la fiche, rien n'est ajouté. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Fiche } from "../fiches/schema";
import {
  abreger,
  decouperPourLaVoix,
  pourLaVoix,
  preparerLaLecture,
  scriptFiche,
  scriptHorsDomaine,
  scriptInconnue,
  scriptPrecision,
  scriptPrecisionGenerale,
  scriptSalutation,
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

describe("abreger", () => {
  it("rend un texte court tel quel", () => {
    assert.deepEqual(abreger("2 semaines", 100), { texte: "2 semaines", coupe: false });
  });
  it("coupe un texte long au premier point-virgule et le signale", () => {
    const long = `2 semaines ; ${"les dossiers des élèves sont traités en priorité ".repeat(3)}`;
    assert.deepEqual(abreger(long, 100), { texte: "2 semaines", coupe: true });
  });
  it("coupe aussi à la première fin de phrase", () => {
    const long = `Au Sénégal : commissariat de police. À l'étranger : ${"consulats généraux ".repeat(8)}`;
    assert.deepEqual(abreger(long, 100), { texte: "Au Sénégal : commissariat de police", coupe: true });
  });
  it("garde un texte long qui n'a ni point-virgule ni fin de phrase : on ne coupe pas une phrase au milieu", () => {
    const long = "mot ".repeat(40).trim();
    assert.deepEqual(abreger(long, 100), { texte: long, coupe: false });
  });
  it("ne prend pas le point final pour une fin de phrase", () => {
    const long = `${"mot ".repeat(40)}fin.`;
    assert.equal(abreger(long, 100).coupe, false);
  });
});

describe("scriptFiche : l'essentiel, dans l'ordre de l'écran", () => {
  const INTRO = "Pour un duplicata, va à la Section CNI.";
  const VERIFIEE = { type: "verifie", libelle: "Vérifié le 14 oct. 2026" } as const;
  const verifiee = { ...FICHE, statut: "verifie", verifie_le: "2026-10-14" } as Fiche;
  const script = scriptFiche({ fiche: verifiee, statut: VERIFIEE, intro: INTRO });
  const textes = script.map((ligne) => ligne.texte);

  it("commence par la phrase qui répond à la question, sans date de vérification ni mention de l'IA", () => {
    assert.deepEqual(script[0], { texte: INTRO, cible: "intro" });
    const tout = textes.join("\n");
    assert.ok(!tout.includes("vérifiée le"));
    assert.ok(!tout.includes("écrite par l’IA"));
    assert.ok(!tout.includes("Information indicative"));
  });
  it("dit le titre à la place quand l'IA n'a pas écrit d'introduction", () => {
    const sans = scriptFiche({ fiche: verifiee, statut: VERIFIEE, intro: null });
    assert.deepEqual(sans[0], { texte: "Duplicata de la carte nationale d’identité.", cible: "titre" });
    assert.ok(!sans.map((l) => l.texte).join("\n").includes("Établissement d’un duplicata"));
  });
  it("dit le coût, puis le délai et le lieu, chacun lié à son bloc", () => {
    assert.deepEqual(script.find((l) => l.cible === "cout"), { texte: "Coût : Timbre de 10 000 FCFA.", cible: "cout" });
    assert.deepEqual(script.find((l) => l.cible === "delai"), { texte: "Délai : non précisé.", cible: "delai" });
    assert.deepEqual(script.find((l) => l.cible === "lieu"), { texte: "Où : Section CNI du commissariat.", cible: "lieu" });
  });
  it("ne dit que le début d'un lieu ou d'un délai très long, et renvoie à l'écran pour le reste", () => {
    const longue = {
      ...verifiee,
      delai: `2 semaines ; ${"les dossiers des élèves sont traités en priorité ".repeat(3)}`,
      lieu: `Commissariat de police dont relève le domicile ; ${"pour les Sénégalais de l'étranger ".repeat(4)}`,
    } as Fiche;
    const s = scriptFiche({ fiche: longue, statut: VERIFIEE, intro: INTRO });
    assert.equal(s.find((l) => l.cible === "delai")?.texte, "Délai : 2 semaines. Le reste est à l’écran.");
    assert.equal(s.find((l) => l.cible === "lieu")?.texte, "Où : Commissariat de police dont relève le domicile. Le reste est à l’écran.");
  });
  it("ne coupe jamais le coût", () => {
    const cher = { ...verifiee, cout: `Première étape gratuite ; ${"2 300 FCFA pour l'établissement du certificat ".repeat(3)}` } as Fiche;
    const s = scriptFiche({ fiche: cher, statut: VERIFIEE, intro: INTRO });
    assert.ok(s.find((l) => l.cible === "cout")?.texte.includes("2 300 FCFA"));
    assert.ok(!s.find((l) => l.cible === "cout")?.texte.includes("Le reste"));
  });
  it("dit chaque pièce, sans sa précision entre parenthèses, après « Ce qu’il faut apporter »", () => {
    const i = textes.indexOf("Ce qu’il faut apporter.");
    assert.ok(i > 0);
    assert.deepEqual(script.slice(i, i + 4), [
      { texte: "Ce qu’il faut apporter.", cible: "pieces" },
      { texte: "Un extrait de naissance.", cible: "piece-0" },
      { texte: "Un certificat de perte, délivré par la police.", cible: "piece-1" },
      { texte: "Un timbre de 10 000 FCFA.", cible: "piece-2" },
    ]);
  });
  it("renvoie à l'écran pour les pièces au-delà de la sixième", () => {
    const nombreuses = { ...verifiee, pieces: Array.from({ length: 9 }, (_, n) => `Pièce numéro ${n + 1}`) } as Fiche;
    const s = scriptFiche({ fiche: nombreuses, statut: VERIFIEE, intro: INTRO });
    const cibles = s.map((l) => l.cible);
    assert.ok(cibles.includes("piece-5"));
    assert.ok(!cibles.includes("piece-6"));
    assert.deepEqual(s.find((l) => l.texte.startsWith("Et 3 autres")), { texte: "Et 3 autres pièces, à l’écran.", cible: "pieces" });
  });
  it("dit au singulier « Et 1 autre pièce »", () => {
    const sept = { ...verifiee, pieces: Array.from({ length: 7 }, (_, n) => `Pièce numéro ${n + 1}`) } as Fiche;
    const s = scriptFiche({ fiche: sept, statut: VERIFIEE, intro: INTRO });
    assert.ok(s.some((l) => l.texte === "Et 1 autre pièce, à l’écran."));
  });
  it("ne lit ni les notes « à confirmer » ni les étapes : une phrase renvoie à l'écran", () => {
    const tout = textes.join("\n");
    assert.ok(!tout.includes("Divergence entre deux pages"));
    assert.ok(!tout.includes("Se procurer un certificat de perte"));
    assert.deepEqual(script.find((l) => l.cible === "a-confirmer"), {
      texte: "Attention, une information est à confirmer : regarde l’écran.",
      cible: "a-confirmer",
    });
    assert.deepEqual(script.at(-1), { texte: "Il y a 2 étapes, juste en dessous.", cible: "etapes" });
  });
  it("signale aussi une pièce « à confirmer » quand la fiche n'a aucune note à confirmer", () => {
    const sansNote = { ...verifiee, corps: "" } as Fiche;
    assert.ok(scriptFiche({ fiche: sansNote, statut: VERIFIEE, intro: INTRO }).some((l) => l.cible === "a-confirmer"));
  });
  it("ne parle pas de « à confirmer » quand il n'y a rien à confirmer", () => {
    const net = { ...verifiee, corps: "", pieces: ["Un extrait de naissance", "Un timbre de 10 000 FCFA"] } as Fiche;
    assert.ok(!scriptFiche({ fiche: net, statut: VERIFIEE, intro: INTRO }).some((l) => l.cible === "a-confirmer"));
  });
  it("dit « Il y a 1 étape » au singulier", () => {
    const une = { ...verifiee, etapes: ["Déposer la demande."] } as Fiche;
    assert.equal(scriptFiche({ fiche: une, statut: VERIFIEE, intro: INTRO }).at(-1)?.texte, "Il y a 1 étape, juste en dessous.");
  });
  it("saute les pièces quand la fiche n'en a pas", () => {
    const nue = { ...verifiee, pieces: [], corps: "" } as Fiche;
    const s = scriptFiche({ fiche: nue, statut: VERIFIEE, intro: INTRO });
    assert.ok(!s.some((l) => l.cible === "pieces" || l.cible?.startsWith("piece-")));
  });
  it("garde l'avertissement d'une fiche non vérifiée, en premier", () => {
    const s = scriptFiche({ fiche: FICHE, statut: BROUILLON, intro: INTRO });
    assert.deepEqual(s[0], { texte: "Attention, cette fiche n’est pas encore vérifiée.", cible: "statut" });
    assert.deepEqual(s[1], { texte: INTRO, cible: "intro" });
  });
  it("garde l'avertissement quand la vérification date de plus d'un an", () => {
    const vieille = { ...FICHE, statut: "verifie", verifie_le: "2024-01-05" } as Fiche;
    const s = scriptFiche({ fiche: vieille, statut: { type: "perimee", libelle: "Vérifié il y a plus d’un an" }, intro: INTRO });
    assert.deepEqual(s[0], { texte: "Attention, cette fiche a été vérifiée il y a plus d’un an.", cible: "statut" });
  });
  it("est bien plus court que l'écran entier", () => {
    const longueur = textes.join(" ").length;
    assert.ok(longueur < 400, `trop long : ${longueur} caractères`);
  });
});

describe("autres réponses", () => {
  it("dit « je ne sais pas » sans rien inventer", () => {
    assert.deepEqual(scriptInconnue(), [
      "Je ne sais pas encore.",
      "Je n’ai pas de source officielle pour ça. Je préfère te le dire plutôt que d’inventer.",
    ]);
  });
  it("dit la phrase écrite pour la question à la place de la phrase habituelle, pour « je ne sais pas »", () => {
    assert.deepEqual(scriptInconnue("Je n’ai pas encore de source officielle pour le visa."), [
      "Je ne sais pas encore.",
      "Je n’ai pas encore de source officielle pour le visa.",
    ]);
  });
  it("dit que le sujet n'est pas son domaine, avec la phrase écrite pour la question", () => {
    assert.deepEqual(scriptHorsDomaine("Les recettes, ce n’est pas mon domaine."), [
      "Ce n’est pas mon domaine.",
      "Les recettes, ce n’est pas mon domaine.",
    ]);
  });
  it("garde une phrase habituelle polie quand il n'y a pas de phrase écrite pour la question", () => {
    assert.deepEqual(scriptHorsDomaine(), [
      "Ce n’est pas mon domaine.",
      "Je réponds aux questions sur les démarches administratives au Sénégal : papiers, certificats, permis…",
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
  it("salue en retour dans la langue reçue, puis invite à poser sa question", () => {
    assert.deepEqual(
      scriptSalutation("Bonsoir !", "Comment puis-je t’aider aujourd’hui ? Pose-moi ta question sur tes démarches administratives au Sénégal."),
      ["Bonsoir !", "Comment puis-je t’aider aujourd’hui ? Pose-moi ta question sur tes démarches administratives au Sénégal."],
    );
    assert.deepEqual(scriptSalutation("Maalekum salam !", "Lan nga bëgg a laaj ci say démarches administratives ci Senegaal ?"), [
      "Maalekum salam !",
      "Lan nga bëgg a laaj ci say démarches administratives ci Senegaal ?",
    ]);
  });
});

describe("preparerLaLecture", () => {
  it("prépare chaque paragraphe pour la voix, le coupe en morceaux courts et garde son bloc d'écran", () => {
    assert.deepEqual(
      preparerLaLecture([
        { texte: "Coût : Timbre de 10 000 FCFA.", cible: "cout" },
        { texte: "Étape 1. Aller à Pointe-Noire (Congo).", cible: "etapes" },
      ]),
      [
        { texte: "Coût : Timbre de 10000 francs CFA.", cible: "cout" },
        { texte: "Étape 1.", cible: "etapes" },
        { texte: "Aller à Pointe-Noire, Congo.", cible: "etapes" },
      ],
    );
  });
  it("accepte un simple texte, sans bloc d'écran", () => {
    assert.deepEqual(preparerLaLecture(["Je ne sais pas encore."]), [{ texte: "Je ne sais pas encore.", cible: null }]);
  });
  it("ne rend rien pour une réponse vide", () => {
    assert.deepEqual(preparerLaLecture([]), []);
    assert.deepEqual(preparerLaLecture(["", "  "]), []);
  });
});
