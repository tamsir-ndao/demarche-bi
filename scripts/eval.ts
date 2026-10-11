// Mesure Démarche-Bi sur eval/questions.jsonl.
//   npm run eval -- --brouillons                 la recherche seule (sans IA) : la question brute est donnée à la recherche
//   npm run eval -- --brouillons --seuil=0.5     essaie un autre seuil de pertinence
//   npm run eval -- --brouillons --detail        affiche le résultat de chaque question
//   npm run eval -- --ia --brouillons            de bout en bout, avec l'IA : le parcours du site (clé dans .env.local)
//   npm run eval -- --ia --brouillons --pause=30 attend 30 secondes entre deux questions (15 par défaut)
// Code de sortie 1 si le fichier de questions est invalide ou ne colle pas aux fiches, jamais à cause des scores.
import fs from "node:fs";
import path from "node:path";
import { poserQuestion } from "../src/lib/ai/ask";
import { getChatProviders } from "../src/lib/ai/config";
import { modeleParDefaut } from "../src/lib/ai/structured";
import {
  evaluerBoutEnBout,
  resumerBoutEnBout,
  type ResultatBoutEnBout,
  type SyntheseBoutEnBout,
} from "../src/lib/eval/bout-en-bout";
import {
  evaluerRecherche,
  LANGUES,
  parseQuestions,
  verifierDonnees,
  type Langue,
  type ResultatQuestion,
  type Synthese,
} from "../src/lib/eval/retrieval";
import { fichePourAffichage, filtrerAffichables } from "../src/lib/fiches/affichage";
import { loadFiches } from "../src/lib/fiches/load";
import { LIMITE_PAR_DEFAUT, SEUIL_PERTINENCE } from "../src/lib/fiches/search";

function echec(message: string): never {
  console.error(message);
  process.exit(1);
}

const PAUSE_PAR_DEFAUT_SECONDES = 15;

const args = process.argv.slice(2);
const ia = args.includes("--ia");
if (ia) {
  // La clé IA est dans .env.local, comme pour le site ; les variables déjà définies dans l'environnement restent prioritaires.
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Pas de .env.local : les variables viennent alors de l'environnement.
  }
}
const inclureBrouillons = args.includes("--brouillons") || process.env.DEMARCHE_INCLUDE_DRAFTS === "true";
const detail = args.includes("--detail");
const inconnues = args.filter(
  (a) =>
    a !== "--brouillons" && a !== "--detail" && a !== "--ia" && !a.startsWith("--seuil=") && !a.startsWith("--pause="),
);
if (inconnues.length > 0) echec(`Option inconnue : ${inconnues.join(", ")}`);

let seuil: number | undefined;
const argSeuil = args.find((a) => a.startsWith("--seuil="));
if (argSeuil) {
  if (ia) echec("--seuil ne s'applique pas à --ia (le seuil est celui de la recherche seule).");
  seuil = Number(argSeuil.slice("--seuil=".length));
  if (!Number.isFinite(seuil) || seuil < 0) echec("--seuil attend un nombre positif, par exemple --seuil=0.5");
}

let pauseSecondes = PAUSE_PAR_DEFAUT_SECONDES;
const argPause = args.find((a) => a.startsWith("--pause="));
if (argPause) {
  if (!ia) echec("--pause ne s'applique qu'avec --ia.");
  pauseSecondes = Number(argPause.slice("--pause=".length));
  if (!Number.isFinite(pauseSecondes) || pauseSecondes < 0) echec("--pause attend un nombre de secondes, par exemple --pause=30");
}

const fichier = path.join(process.cwd(), "eval", "questions.jsonl");
if (!fs.existsSync(fichier)) echec(`Fichier introuvable : ${fichier}`);

const { fiches, errors } = loadFiches();
if (errors.length > 0) echec(`Fiches invalides (lance npm run validate:fiches) :\n- ${errors.join("\n- ")}`);

const lecture = parseQuestions(fs.readFileSync(fichier, "utf8"));
const problemes = [...lecture.erreurs, ...verifierDonnees(lecture.questions, fiches)];
if (problemes.length > 0) echec(`${problemes.length} problème(s) dans eval/questions.jsonl :\n- ${problemes.join("\n- ")}`);

const interrogees = fiches.filter((f) => inclureBrouillons || f.statut === "verifie").length;
const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)} %`);
const rapport = (n: number, d: number) => `${n}/${d}`.padStart(6) + `  ${pct(n, d)}`;

const NOMS_LANGUES: Record<Langue, string> = { fr: "français", mixte: "français et wolof mêlés", wo: "wolof" };
const NOMS_FAMILLES = { couverte: "couverte", hors_perimetre: "hors périmètre", vague: "vague" } as const;
const MARQUES = { reussie: "✓", partielle: "~", echouee: "✗", ignoree: "–" } as const;

// --- La recherche seule -------------------------------------------------------------------------------------------

function afficherQuestion(r: ResultatQuestion): void {
  const q = r.question;
  console.log(`  ${MARQUES[r.statut]} ${NOMS_FAMILLES[q.famille]}, ${NOMS_LANGUES[q.langue]} — « ${q.question} »`);
  if (q.attendu_slug) console.log(`      attendu : ${q.attendu_slug}${r.rang ? ` (en position ${r.rang})` : ""}`);
  if (r.raison) {
    console.log(`      ignorée : ${r.raison}`);
  } else {
    const trouvees = r.trouvees.map((t) => `${t.slug} (${t.score.toFixed(2)})`).join(", ");
    console.log(`      renvoyé : ${trouvees || "(aucune fiche)"}`);
  }
}

function ligneSynthese(s: Synthese): string {
  const c = s.couvertes;
  return `couvertes : 1er ${c.top1}/${c.evaluees}, 3 premières ${c.top3}/${c.evaluees} · refus : ${s.refus.corrects}/${s.refus.evaluees}`;
}

function evaluerRechercheSeule(): void {
  const { global, parLangue, resultats } = evaluerRecherche(lecture.questions, fiches, { inclureBrouillons, seuil });

  console.log("Évaluation de la recherche (sans IA : la question brute est donnée à la recherche)");
  console.log(
    `${lecture.questions.length} questions · ${interrogees} fiche(s) interrogée(s)${inclureBrouillons ? " (brouillons inclus)" : ""} · seuil ${seuil ?? SEUIL_PERTINENCE} · ${LIMITE_PAR_DEFAUT} fiches au plus par question\n`,
  );
  if (interrogees === 0) {
    console.warn("Attention : aucune fiche interrogée. Ajoute --brouillons tant que les fiches sont en brouillon.\n");
  }

  const c = global.couvertes;
  console.log(`Questions couvertes : ${c.evaluees} évaluées${c.ignorees ? `, ${c.ignorees} ignorée(s)` : ""}`);
  console.log(`  fiche attendue en 1er            ${rapport(c.top1, c.evaluees)}`);
  console.log(`  fiche attendue parmi les ${LIMITE_PAR_DEFAUT} premières ${rapport(c.top3, c.evaluees)}`);
  console.log(`Questions hors périmètre : ${global.refus.evaluees} évaluées`);
  console.log(`  refus correct (aucune fiche)     ${rapport(global.refus.corrects, global.refus.evaluees)}`);
  console.log(
    `Questions vagues : ${global.vagues.ignorees} non évaluées (la question de précision demande l'IA : npm run eval -- --ia)\n`,
  );

  console.log("Par langue");
  for (const langue of LANGUES) {
    const synthese = parLangue[langue];
    if (synthese) console.log(`  ${NOMS_LANGUES[langue].padEnd(24)} ${ligneSynthese(synthese)}`);
  }
  console.log("");

  if (detail) {
    console.log("Détail");
    for (const r of resultats) afficherQuestion(r);
  } else {
    const aRegarder = resultats.filter((r) => r.statut === "echouee" || r.statut === "partielle");
    if (aRegarder.length > 0) {
      console.log(`À regarder (${aRegarder.length}) : ✗ échec, ~ fiche attendue présente mais pas en 1er`);
      for (const r of aRegarder) afficherQuestion(r);
    }
    const ignorees = resultats.filter((r) => r.statut === "ignoree" && r.question.famille !== "vague");
    if (ignorees.length > 0) {
      console.log(`\nIgnorées (${ignorees.length}) :`);
      for (const r of ignorees) afficherQuestion(r);
    }
  }
}

// --- De bout en bout, avec l'IA -----------------------------------------------------------------------------------

function ligneBoutEnBout(libelle: string, n: number, d: number): void {
  console.log(`  ${libelle.padEnd(40)} ${rapport(n, d)}`);
}

function ligneSyntheseIA(s: SyntheseBoutEnBout): string {
  return `couvertes : bonne fiche ${s.couvertes.reussies}/${s.couvertes.total} · hors périmètre : ${s.horsPerimetre.reussies}/${s.horsPerimetre.total} · vagues : précision ${s.vagues.reussies}/${s.vagues.total}`;
}

function afficherResumeIA(resultats: ResultatBoutEnBout[]): void {
  const { global, parLangue } = resumerBoutEnBout(resultats);
  const { couvertes: c, horsPerimetre: h, vagues: v, introductions: i } = global;

  console.log(`\nQuestions couvertes : ${c.total}`);
  ligneBoutEnBout("bonne fiche", c.reussies, c.total);
  ligneBoutEnBout("écran de précision avec la bonne fiche", c.partielles, c.total);
  ligneBoutEnBout("mauvaise réponse", c.echouees, c.total);
  console.log(`Questions hors périmètre : ${h.total}`);
  ligneBoutEnBout("« je ne sais pas » correct", h.reussies, h.total);
  console.log(`Questions vagues : ${v.total}`);
  ligneBoutEnBout("question de précision", v.reussies, v.total);
  ligneBoutEnBout("« je ne sais pas » (rien d'inventé)", v.partielles, v.total);
  ligneBoutEnBout("démarche devinée", v.echouees, v.total);

  const reponsesAvecFiche = i.montrees + i.refusees + i.absentes;
  console.log(`\nIntroductions de l'IA, sur ${reponsesAvecFiche} réponse(s) avec une fiche`);
  ligneBoutEnBout("montrées (vérifiées par le code)", i.montrees, reponsesAvecFiche);
  ligneBoutEnBout("refusées par les garde-fous", i.refusees, reponsesAvecFiche);
  ligneBoutEnBout("absentes (IA en échec ou non configurée)", i.absentes, reponsesAvecFiche);

  console.log("\nPar langue");
  for (const langue of LANGUES) {
    const synthese = parLangue[langue];
    if (synthese) console.log(`  ${NOMS_LANGUES[langue].padEnd(24)} ${ligneSyntheseIA(synthese)}`);
  }

  if (global.degrades > 0) {
    console.warn(
      `\nAttention : l'IA a échoué pour ${global.degrades} question(s) (saturation ou panne) : leur résultat est celui du repli sans IA. Relance avec une pause plus longue (--pause=30).`,
    );
  }

  const aRegarder = resultats.filter((r) => r.statut !== "reussie");
  if (aRegarder.length > 0) {
    console.log(`\nÀ regarder (${aRegarder.length}) : ✗ échec, ~ réponse utile mais pas la meilleure`);
    for (const r of aRegarder) {
      const attendu = r.question.attendu_slug ? ` (attendu : ${r.question.attendu_slug})` : "";
      console.log(`  ${MARQUES[r.statut]} ${NOMS_FAMILLES[r.question.famille]} — « ${r.question.question} » → ${r.obtenu}${attendu}`);
    }
  }
}

async function evaluerAvecIA(): Promise<void> {
  const fournisseurs = getChatProviders();
  if (fournisseurs.length === 0) {
    echec("--ia demande une clé IA : renseigne AI_API_KEY dans .env.local (voir docs/SETUP.md).");
  }
  const fichesDuSite = filtrerAffichables(fiches, inclureBrouillons).map(fichePourAffichage);
  if (fichesDuSite.length === 0) {
    echec("Aucune fiche à interroger. Ajoute --brouillons tant que les fiches sont en brouillon.");
  }

  const total = lecture.questions.length;
  console.log("Évaluation de bout en bout (avec l'IA : le parcours du site, de la question à la fiche)");
  console.log(
    `${total} questions · ${fichesDuSite.length} fiche(s) interrogée(s)${inclureBrouillons ? " (brouillons inclus)" : ""} · modèles : ${fournisseurs.map((f) => f.model).join(", ")} · pause ${pauseSecondes} s\n`,
  );

  const resultats = await evaluerBoutEnBout(
    lecture.questions,
    async (question) => {
      let echecsIA = 0;
      const reponse = await poserQuestion(question.question, {
        fiches: fichesDuSite,
        modele: modeleParDefaut,
        signaler: () => {
          echecsIA += 1;
        },
      });
      return { reponse, echecsIA };
    },
    {
      pauseMs: pauseSecondes * 1000,
      surResultat: (r, index) => {
        const progression = `[${String(index + 1).padStart(String(total).length)}/${total}]`;
        const repli = r.degrade ? " (IA en échec : repli)" : "";
        const refus = r.rejet ? ` (introduction refusée : ${r.rejet})` : "";
        console.log(`${progression} ${MARQUES[r.statut]} ${NOMS_FAMILLES[r.question.famille]} — « ${r.question.question} » → ${r.obtenu}${repli}${refus}`);
      },
    },
  );
  afficherResumeIA(resultats);
}

if (ia) {
  evaluerAvecIA().catch((erreur: unknown) => {
    echec(`L'évaluation avec l'IA a échoué : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
  });
} else {
  evaluerRechercheSeule();
}
