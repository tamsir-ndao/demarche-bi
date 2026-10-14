// Mesure la fiabilité de Démarche-Bi : fidélité aux fiches, refus, pièges, saisie (fautes, SMS, oral, wolof) et répétition.
//   npm run fiabilite                                    sans IA, sans coût : valide les jeux, compte les appels IA, mesure la recherche seule
//   npm run fiabilite -- --ia --echantillon              avec l'IA, une sélection d'une centaine d'appels (à lancer d'abord)
//   npm run fiabilite -- --ia --bloc=fidelite            un seul bloc : fidelite, refus, pieges, saisie, repetition (tous par défaut)
//   npm run fiabilite -- --ia --modele=gpt-oss-120b      épingle UN modèle de la cascade (sinon la cascade du site : 120b, qwen, 20b)
//   npm run fiabilite -- --ia --pause=30                 attend 30 secondes entre deux questions (15 par défaut)
//   npm run fiabilite -- --ia --repetitions=5            pose chaque question de la répétition 5 fois (3 par défaut)
//   npm run fiabilite -- --ia --json=/tmp/mesure.json    écrit aussi les résultats question par question (jamais de clé)
//   npm run fiabilite -- --detail                        plus de détail (résultat de chaque question de la recherche, introductions corrigées)
// Les brouillons sont toujours exclus : le site ne les montre pas. Avec l'IA, rien n'est écrit dans le journal : le script
// n'appelle que `poserQuestion` (ni service du site, ni cache, ni base). Code de sortie 1 si un jeu de questions est
// invalide, jamais à cause des scores.
import fs from "node:fs";
import path from "node:path";
import { ErreurIA } from "../src/lib/ai/client";
import { getChatProviders } from "../src/lib/ai/config";
import { chatJson, modeleParDefaut, type Modele } from "../src/lib/ai/structured";
import {
  BLOCS,
  compterAppels,
  construirePlan,
  mesurerFiabilite,
  type Bloc,
  type Jeux,
  type Plan,
} from "../src/lib/eval/fiabilite";
import { parseQuestionsPieges, TYPES_PIEGE, verifierDonneesPieges } from "../src/lib/eval/pieges";
import { genererQuestionsFidelite } from "../src/lib/eval/questions-fidelite";
import { lignesRapport, lignesVolumes, NOMS_BLOCS } from "../src/lib/eval/rapport-fiabilite";
import { evaluerRecherche, parseQuestions, verifierDonnees, type Question, type ResultatQuestion } from "../src/lib/eval/retrieval";
import { fichePourAffichage } from "../src/lib/fiches/affichage";
import { loadFiches } from "../src/lib/fiches/load";
import { LIMITE_PAR_DEFAUT } from "../src/lib/fiches/search";

function echec(message: string): never {
  console.error(message);
  process.exit(1);
}

const PAUSE_PAR_DEFAUT_SECONDES = 15;
const REPETITIONS_PAR_DEFAUT = 3;

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
// Les essais n'écrivent jamais dans le journal du site : l'adresse de la base est retirée de l'environnement, même si elle y était.
delete process.env.DATABASE_URL;

const OPTIONS_SANS_VALEUR = ["--ia", "--echantillon", "--detail"];
const inconnues = args.filter((a) => !OPTIONS_SANS_VALEUR.includes(a) && !/^--(?:bloc|modele|pause|repetitions|json)=/.test(a));
if (inconnues.length > 0) {
  const brouillons = inconnues.includes("--brouillons") ? " (les brouillons sont toujours exclus : le site ne les montre pas)" : "";
  echec(`Option inconnue : ${inconnues.join(", ")}${brouillons}`);
}
const valeur = (nom: string): string | undefined => args.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const detail = args.includes("--detail");
const echantillon = args.includes("--echantillon");

const argBloc = valeur("bloc") ?? "tous";
const blocs: readonly Bloc[] = argBloc === "tous" ? BLOCS : BLOCS.filter((bloc) => bloc === argBloc);
if (blocs.length === 0) echec(`--bloc attend : ${BLOCS.join(", ")} ou tous (reçu : ${argBloc})`);

for (const option of ["pause", "modele", "json"]) {
  if (!ia && valeur(option) !== undefined) echec(`--${option} ne s'applique qu'avec --ia.`);
}
const pauseSecondes = Number(valeur("pause") ?? PAUSE_PAR_DEFAUT_SECONDES);
if (!Number.isFinite(pauseSecondes) || pauseSecondes < 0) echec("--pause attend un nombre de secondes, par exemple --pause=30");
const repetitions = Number(valeur("repetitions") ?? REPETITIONS_PAR_DEFAUT);
if (!Number.isInteger(repetitions) || repetitions < 2) echec("--repetitions attend un entier d'au moins 2, par exemple --repetitions=3");

// --- Les jeux de questions ----------------------------------------------------------------------------------------

const { fiches, errors } = loadFiches();
if (errors.length > 0) echec(`Fiches invalides (lance npm run validate:fiches) :\n- ${errors.join("\n- ")}`);
const verifiees = fiches.filter((fiche) => fiche.statut === "verifie");
if (verifiees.length === 0) echec("Aucune fiche vérifiée à interroger.");

const problemes: string[] = [];

function lire(nom: string): string {
  const fichier = path.join(process.cwd(), "eval", nom);
  if (!fs.existsSync(fichier)) echec(`Fichier introuvable : ${fichier}`);
  return fs.readFileSync(fichier, "utf8");
}

/** Un jeu au schéma de eval/questions.jsonl : lisible, collé aux fiches, et qui n'attend jamais un brouillon. */
function lireQuestions(nom: string): Question[] {
  const { questions, erreurs } = parseQuestions(lire(nom));
  const brouillons = questions
    .filter((q) => q.attendu_slug !== null && fiches.some((f) => f.slug === q.attendu_slug && f.statut !== "verifie"))
    .map((q) => `« ${q.question} » : la fiche « ${q.attendu_slug} » n'est pas vérifiée (le site ne la montre pas)`);
  problemes.push(...[...erreurs, ...verifierDonnees(questions, fiches), ...brouillons].map((p) => `${nom} : ${p}`));
  return questions;
}

const refus = lireQuestions("fiabilite-refus.jsonl");
const saisie = lireQuestions("fiabilite-saisie.jsonl");
const lecturePieges = parseQuestionsPieges(lire("fiabilite-pieges.jsonl"));
const pieges = lecturePieges.questions;
problemes.push(...[...lecturePieges.erreurs, ...verifierDonneesPieges(pieges, fiches)].map((p) => `fiabilite-pieges.jsonl : ${p}`));
const fidelite = genererQuestionsFidelite(fiches);
if (fidelite.length === 0) problemes.push("fidélité : aucune question générée");

if (problemes.length > 0) echec(`${problemes.length} problème(s) dans les jeux de questions :\n- ${problemes.join("\n- ")}`);

const jeux: Jeux = { fidelite, refus, pieges, saisie };
const plan: Plan = construirePlan(jeux, { blocs, echantillon, repetitions });
const execution = compterAppels(plan);
const nomDeLExecution = `${echantillon ? "échantillon" : "mesure complète"}, ${argBloc === "tous" ? "tous les blocs" : `bloc ${NOMS_BLOCS[blocs[0]]}`}`;

// --- Sans IA : les jeux, le coût, la recherche seule ---------------------------------------------------------------

const MARQUES = { reussie: "✓", partielle: "~", echouee: "✗", ignoree: "–" } as const;
const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)} %`);
const rapport = (n: number, d: number) => `${n}/${d}`.padStart(7) + `  ${pct(n, d)}`;

function ligneRecherche(nom: string, r: ResultatQuestion): string {
  const attendu = r.question.attendu_slug ? ` → attendu : ${r.question.attendu_slug}${r.rang ? ` (en position ${r.rang})` : ""}` : "";
  const trouvees = r.trouvees.map((t) => `${t.slug} (${t.score.toFixed(2)})`).join(", ") || "(aucune fiche)";
  return `  ${MARQUES[r.statut]} ${nom} — « ${r.question.question} »${attendu} · renvoyé : ${trouvees}`;
}

function mesurerSansIA(): void {
  const questionsDeFidelite = fidelite.length;
  const sansReponse = fidelite.filter((q) => q.attendu === "ne_sait_pas").length;
  const parType = TYPES_PIEGE.map((type) => `${type} ${pieges.filter((q) => q.piege === type).length}`).join(", ");

  console.log("Fiabilité de Démarche-Bi (sans IA : jeux validés, recherche seule, aucun coût)");
  console.log(`${verifiees.length} fiche(s) vérifiée(s) interrogée(s) · les brouillons sont toujours exclus\n`);

  console.log("Jeux de questions (tous valides)");
  console.log(`  ${NOMS_BLOCS.fidelite.padEnd(22)} ${questionsDeFidelite} questions générées (une par fiche et par champ), dont ${sansReponse} « ne sait pas »`);
  console.log(`  ${NOMS_BLOCS.refus.padEnd(22)} ${refus.length} questions · eval/fiabilite-refus.jsonl`);
  console.log(`  ${NOMS_BLOCS.pieges.padEnd(22)} ${pieges.length} questions · eval/fiabilite-pieges.jsonl · ${parType}`);
  console.log(`  ${NOMS_BLOCS.saisie.padEnd(22)} ${saisie.length} questions · eval/fiabilite-saisie.jsonl`);
  console.log(`  ${NOMS_BLOCS.repetition.padEnd(22)} quelques questions de ces jeux, posées ${repetitions} fois chacune\n`);

  console.log("Appels IA qu'une exécution coûterait (estimation : voir docs/FIABILITE.md)");
  console.log(lignesVolumes(construirePlan(jeux, { repetitions }), construirePlan(jeux, { echantillon: true, repetitions })).join("\n"));
  const minutes = Math.ceil((execution.total.questions * PAUSE_PAR_DEFAUT_SECONDES) / 60);
  console.log(
    `\nAvec les options données (${nomDeLExecution}) : ${execution.total.questions} questions, environ ${execution.total.appels} appels IA, au moins ${minutes} minutes avec la pause par défaut de ${PAUSE_PAR_DEFAUT_SECONDES} s.`,
  );
  console.log("Pour mesurer avec l'IA : npm run fiabilite -- --ia --echantillon (clé dans .env.local)\n");

  // La recherche seule : la question brute est donnée à la recherche, comme quand l'IA manque. C'est une borne basse.
  console.log("Recherche seule (sans IA : la question brute est donnée à la recherche, brouillons exclus)");
  const aRegarder: string[] = [];
  const ouvertes = [
    { bloc: "saisie" as const, nom: "saisie", questions: saisie },
    { bloc: "refus" as const, nom: "refus", questions: refus },
  ].filter(({ bloc }) => blocs.includes(bloc));
  for (const { nom, questions } of ouvertes) {
    const { global, resultats } = evaluerRecherche(questions, fiches);
    const c = global.couvertes;
    if (c.evaluees > 0) {
      console.log(`  ${nom} : fiche attendue en 1er ${rapport(c.top1, c.evaluees)} · parmi les ${LIMITE_PAR_DEFAUT} premières ${rapport(c.top3, c.evaluees)}`);
    }
    if (global.refus.evaluees > 0) {
      console.log(`  ${nom} : refus correct (aucune fiche) ${rapport(global.refus.corrects, global.refus.evaluees)}`);
    }
    if (global.vagues.ignorees > 0) console.log(`  ${nom} : ${global.vagues.ignorees} question(s) vague(s) non évaluée(s) : la question de précision demande l'IA`);
    for (const r of resultats) {
      if (detail || r.statut === "echouee" || r.statut === "partielle") aRegarder.push(ligneRecherche(nom, r));
    }
  }
  if (ouvertes.length === 0) console.log("  (rien à mesurer sans IA pour ce bloc)");
  if (aRegarder.length > 0) {
    console.log(`\n${detail ? "Détail" : "À regarder"} (${aRegarder.length}) : ✗ échec, ~ fiche attendue présente mais pas en 1er`);
    console.log(aRegarder.join("\n"));
  }
}

// --- Avec l'IA ----------------------------------------------------------------------------------------------------

async function mesurerAvecIA(): Promise<void> {
  const fournisseurs = getChatProviders();
  if (fournisseurs.length === 0) {
    echec("--ia demande une clé IA : renseigne AI_API_KEY dans .env.local (voir docs/SETUP.md).");
  }

  // --modele épingle un seul modèle de la cascade : sans lui, le site passerait au suivant dès que le premier sature,
  // et la mesure mélangerait les modèles.
  let utilises = fournisseurs;
  let modele: Modele = modeleParDefaut;
  const epingle = valeur("modele");
  if (epingle !== undefined) {
    const choisis = fournisseurs.filter((f) => f.name === epingle || f.model === epingle || f.model.endsWith(`/${epingle}`));
    if (choisis.length !== 1) {
      echec(`--modele=${epingle} ne désigne aucun modèle de la cascade. Choix : ${fournisseurs.map((f) => `${f.name} (${f.model})`).join(", ")}`);
    }
    utilises = choisis;
    modele = (appel) => chatJson(appel, { providers: choisis });
  }

  // Les fiches telles que le site les montre : vérifiées seulement, mises en forme comme à l'écran.
  const fichesDuSite = verifiees.map(fichePourAffichage);

  console.log("Fiabilité de Démarche-Bi (avec l'IA : le parcours du site, sans journal ni cache)");
  console.log(
    `${nomDeLExecution} · ${execution.total.questions} questions, environ ${execution.total.appels} appels IA · ${fichesDuSite.length} fiche(s) · modèles : ${utilises.map((f) => f.model).join(", ")} · pause ${pauseSecondes} s\n`,
  );

  const resultats = await mesurerFiabilite(plan, {
    fiches: fichesDuSite,
    modele,
    pauseMs: pauseSecondes * 1000,
    surProgression: (bloc, ligne) => console.log(`${bloc.padEnd(10)} ${ligne}`),
  });
  console.log(lignesRapport(resultats, { detail }).join("\n"));

  const chemin = valeur("json");
  if (chemin !== undefined) {
    const sortie = {
      date: new Date().toISOString(),
      modeles: utilises.map((f) => f.model),
      options: { bloc: argBloc, echantillon, pauseSecondes, repetitions },
      volume: execution,
      resultats,
    };
    fs.mkdirSync(path.dirname(path.resolve(chemin)), { recursive: true });
    fs.writeFileSync(path.resolve(chemin), `${JSON.stringify(sortie, null, 2)}\n`);
    console.log(`\nRésultats écrits dans ${path.resolve(chemin)}`);
  }
}

if (ia) {
  mesurerAvecIA().catch((erreur: unknown) => {
    // La nature suffit : le message d'une erreur inconnue pourrait citer une adresse ou un en-tête.
    echec(`La mesure avec l'IA a échoué : ${erreur instanceof ErreurIA ? erreur.nature : erreur instanceof Error ? erreur.name : "erreur inattendue"}`);
  });
} else {
  mesurerSansIA();
}
