// Mesure la recherche (sans IA) sur eval/questions.jsonl : la question brute est donnée à la recherche.
//   npm run eval -- --brouillons                 inclut les fiches brouillon (toutes le sont pour l'instant)
//   npm run eval -- --brouillons --seuil=0.5     essaie un autre seuil de pertinence
//   npm run eval -- --brouillons --detail        affiche le résultat de chaque question
// Code de sortie 1 si le fichier de questions est invalide ou ne colle pas aux fiches, jamais à cause des scores.
import fs from "node:fs";
import path from "node:path";
import {
  evaluerRecherche,
  LANGUES,
  parseQuestions,
  verifierDonnees,
  type Langue,
  type ResultatQuestion,
  type Synthese,
} from "../src/lib/eval/retrieval";
import { loadFiches } from "../src/lib/fiches/load";
import { LIMITE_PAR_DEFAUT, SEUIL_PERTINENCE } from "../src/lib/fiches/search";

function echec(message: string): never {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const inclureBrouillons = args.includes("--brouillons") || process.env.DEMARCHE_INCLUDE_DRAFTS === "true";
const detail = args.includes("--detail");
const inconnues = args.filter((a) => a !== "--brouillons" && a !== "--detail" && !a.startsWith("--seuil="));
if (inconnues.length > 0) echec(`Option inconnue : ${inconnues.join(", ")}`);

let seuil: number | undefined;
const argSeuil = args.find((a) => a.startsWith("--seuil="));
if (argSeuil) {
  seuil = Number(argSeuil.slice("--seuil=".length));
  if (!Number.isFinite(seuil) || seuil < 0) echec("--seuil attend un nombre positif, par exemple --seuil=0.5");
}

const fichier = path.join(process.cwd(), "eval", "questions.jsonl");
if (!fs.existsSync(fichier)) echec(`Fichier introuvable : ${fichier}`);

const { fiches, errors } = loadFiches();
if (errors.length > 0) echec(`Fiches invalides (lance npm run validate:fiches) :\n- ${errors.join("\n- ")}`);

const lecture = parseQuestions(fs.readFileSync(fichier, "utf8"));
const problemes = [...lecture.erreurs, ...verifierDonnees(lecture.questions, fiches)];
if (problemes.length > 0) echec(`${problemes.length} problème(s) dans eval/questions.jsonl :\n- ${problemes.join("\n- ")}`);

const { global, parLangue, resultats } = evaluerRecherche(lecture.questions, fiches, { inclureBrouillons, seuil });

const interrogees = fiches.filter((f) => inclureBrouillons || f.statut === "verifie").length;
const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)} %`);
const rapport = (n: number, d: number) => `${n}/${d}`.padStart(6) + `  ${pct(n, d)}`;

const NOMS_LANGUES: Record<Langue, string> = { fr: "français", mixte: "français et wolof mêlés", wo: "wolof" };
const NOMS_FAMILLES = { couverte: "couverte", hors_perimetre: "hors périmètre", vague: "vague" } as const;
const MARQUES = { reussie: "✓", partielle: "~", echouee: "✗", ignoree: "–" } as const;

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
console.log(`Questions vagues : ${global.vagues.ignorees} non évaluées (la question de précision demande l'IA)\n`);

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
