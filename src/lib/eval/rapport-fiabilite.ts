import { resumerBoutEnBout, type ResultatBoutEnBout } from "./bout-en-bout";
import {
  BLOCS,
  compterAppels,
  LIBELLES_FIDELITE,
  resumerFidelite,
  resumerPieges,
  STATUTS_FIDELITE,
  type Bloc,
  type Plan,
  type Resultats,
} from "./fiabilite";
import { LANGUES, type Langue } from "./retrieval";

// Mise en forme des chiffres de `npm run fiabilite` : des lignes de texte, que le script n'a plus qu'à afficher. Rien
// d'autre que les questions, les réponses du site et les chiffres n'entre ici : ni clé, ni en-tête, ni adresse de fournisseur.

export const NOMS_BLOCS: Record<Bloc, string> = {
  fidelite: "fidélité",
  refus: "refus",
  pieges: "pièges",
  saisie: "saisie, oral et wolof",
  repetition: "répétition",
};

const NOMS_LANGUES: Record<Langue, string> = { fr: "français", mixte: "français et wolof mêlés", wo: "wolof" };

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)} %`);
const rapport = (n: number, d: number) => `${n}/${d}`.padStart(7) + `  ${pct(n, d)}`;
const ligne = (libelle: string, n: number, d: number) => `  ${libelle.padEnd(44)} ${rapport(n, d)}`;
const tenu = (compte: number) => (compte === 0 ? "seuil 0 : tenu" : "seuil 0 : NON TENU");

/** Le tableau « combien d'appels IA coûterait une exécution », pour la mesure complète et pour l'échantillon. */
export function lignesVolumes(complet: Plan, echantillon: Plan): string[] {
  const c = compterAppels(complet);
  const e = compterAppels(echantillon);
  const cellule = (v: { questions: number; appels: number }) => `${String(v.questions).padStart(4)} questions · ${String(v.appels).padStart(4)} appels`;
  const lignes = [`  ${"".padEnd(22)} ${"mesure complète".padEnd(27)} échantillon`];
  for (const bloc of BLOCS) lignes.push(`  ${NOMS_BLOCS[bloc].padEnd(22)} ${cellule(c.parBloc[bloc]).padEnd(27)} ${cellule(e.parBloc[bloc])}`);
  lignes.push(`  ${"total".padEnd(22)} ${cellule(c.total).padEnd(27)} ${cellule(e.total)}`);
  return lignes;
}

function lignesBoutEnBout(resultats: ResultatBoutEnBout[]): string[] {
  const { global, parLangue } = resumerBoutEnBout(resultats);
  const { couvertes: c, horsPerimetre: h, vagues: v, introductions: i } = global;
  const lignes: string[] = [];
  if (c.total > 0) {
    lignes.push(`  Questions couvertes : ${c.total}`);
    lignes.push(ligne("bonne fiche", c.reussies, c.total));
    lignes.push(ligne("écran de précision avec la bonne fiche", c.partielles, c.total));
    lignes.push(ligne("mauvaise réponse", c.echouees, c.total));
  }
  if (h.total > 0) {
    lignes.push(`  Questions hors périmètre : ${h.total}`);
    lignes.push(ligne("refus à bon escient (« je ne sais pas »)", h.reussies, h.total));
    lignes.push(ligne("une fiche ou une précision a été montrée", h.echouees, h.total));
  }
  if (v.total > 0) {
    lignes.push(`  Questions vagues : ${v.total}`);
    lignes.push(ligne("question de précision", v.reussies, v.total));
    lignes.push(ligne("« je ne sais pas » (rien d'inventé)", v.partielles, v.total));
    lignes.push(ligne("démarche devinée", v.echouees, v.total));
  }
  const avecFiche = i.montrees + i.refusees + i.absentes;
  if (avecFiche > 0) {
    lignes.push(`  Introductions, sur ${avecFiche} réponse(s) avec une fiche : ${i.montrees} montrées, ${i.refusees} refusées par les garde-fous, ${i.absentes} absentes`);
  }
  const langues = LANGUES.flatMap((langue) => {
    const s = parLangue[langue];
    if (!s) return [];
    const chiffres = [
      ...(s.couvertes.total > 0 ? [`bonne fiche ${s.couvertes.reussies}/${s.couvertes.total}`] : []),
      ...(s.horsPerimetre.total > 0 ? [`refus ${s.horsPerimetre.reussies}/${s.horsPerimetre.total}`] : []),
    ];
    return [`    ${NOMS_LANGUES[langue].padEnd(24)} ${chiffres.join(" · ")}`];
  });
  if (langues.length > 1) lignes.push("  Par langue", ...langues);
  return lignes;
}

function avertissement(bloc: Bloc, degrades: number): string[] {
  if (degrades === 0) return [];
  return [
    `  Attention : l'IA a échoué pour ${degrades} question(s) (saturation ou panne). Leur résultat est celui du repli sans IA : la mesure de ce bloc (${NOMS_BLOCS[bloc]}) est à refaire, avec --pause=30 ou --modele=<nom>.`,
  ];
}

/** Les chiffres de chaque bloc mesuré, puis la liste de ce qui a échoué (tout ce qui n'est pas parfait avec `detail`). */
export function lignesRapport(resultats: Resultats, { detail = false }: { detail?: boolean } = {}): string[] {
  const lignes: string[] = [];
  const bloc = (titre: string, contenu: string[]) => lignes.push("", titre, ...contenu);

  if (resultats.fidelite.length > 0) {
    const r = resumerFidelite(resultats.fidelite);
    const contenu = STATUTS_FIDELITE.map((statut) => {
      const critique = statut === "invente" || statut === "devine" ? `  (${tenu(r.statuts[statut])})` : "";
      return `${ligne(LIBELLES_FIDELITE[statut], r.statuts[statut], r.total)}${critique}`;
    });
    contenu.push(ligne("bonne fiche montrée", r.bonneFiche, r.total));
    if (r.neSaitPas.total > 0) contenu.push(ligne("champs vides devinés, sur les « ne sait pas »", r.neSaitPas.devines, r.neSaitPas.total));
    bloc(`Fidélité : ${r.total} question(s). Inventé et deviné sont les échecs critiques.`, [...contenu, ...avertissement("fidelite", r.degrades)]);
  }
  if (resultats.refus.length > 0) {
    bloc(`Refus : ${resultats.refus.length} question(s)`, [...lignesBoutEnBout(resultats.refus), ...avertissement("refus", resultats.refus.filter((r) => r.degrade).length)]);
  }
  if (resultats.pieges.length > 0) {
    const r = resumerPieges(resultats.pieges);
    const parType = Object.entries(r.parType).flatMap(([type, c]) => (c.total > 0 ? [ligne(`  ${type}`, c.reussies, c.total)] : []));
    bloc(`Pièges : ${r.total} question(s)`, [ligne("pièges réussis", r.reussies, r.total), ...parType, ...avertissement("pieges", r.degrades)]);
  }
  if (resultats.saisie.length > 0) {
    bloc(`Saisie, oral et wolof : ${resultats.saisie.length} question(s)`, [...lignesBoutEnBout(resultats.saisie), ...avertissement("saisie", resultats.saisie.filter((r) => r.degrade).length)]);
  }
  if (resultats.repetition.length > 0) {
    const stables = resultats.repetition.filter((r) => r.stable).length;
    const instables = resultats.repetition.filter((r) => !r.stable);
    bloc(`Répétition : ${resultats.repetition.length} question(s), ${resultats.repetition[0].essais} essais chacune`, [
      ligne("réponses stables (même type, mêmes démarches)", stables, resultats.repetition.length),
      ...instables.map((r) => `    ✗ « ${r.question} » : ${Object.entries(r.types).map(([type, n]) => `${type} ×${n}`).join(", ")}`),
      ...avertissement("repetition", resultats.repetition.reduce((somme, r) => somme + r.degrades, 0)),
    ]);
  }

  const echecs = lignesEchecs(resultats, detail);
  if (echecs.length > 0) {
    lignes.push("", "À regarder (✗ échec, ~ réponse utile mais pas la meilleure)", ...echecs);
  }
  return lignes;
}

/** Ce qui a échoué, une ligne par question avec la raison. `detail` ajoute les introductions que les garde-fous ont dû corriger. */
function lignesEchecs(resultats: Resultats, detail: boolean): string[] {
  const lignes: string[] = [];

  for (const r of resultats.fidelite) {
    const { statut, absentsFinal, absentsBrut } = r.jugement;
    const critique = statut === "invente" || statut === "devine";
    if (!critique && !(detail && statut === "corrige_par_garde_fous")) continue;
    const cite = (elements: typeof absentsFinal) => elements.map((e) => e.texte).join(", ");
    const raison =
      statut === "devine"
        ? "le champ de la fiche est vide et l'introduction lui donne une valeur"
        : statut === "invente"
          ? `absent de la fiche : ${cite(absentsFinal)}`
          : `le modèle avait écrit, sans appui dans la fiche : ${cite(absentsBrut)}`;
    lignes.push(`  ✗ fidélité, ${LIBELLES_FIDELITE[statut]} — « ${r.question.question} » (${r.question.champ}) : ${raison}`);
    if (critique && r.intro !== null) lignes.push(`      introduction montrée : « ${r.intro} »`);
  }
  for (const bloc of ["refus", "saisie"] as const) {
    for (const r of resultats[bloc]) {
      if (r.statut === "reussie") continue;
      const attendu = r.question.attendu_slug ? ` (attendu : ${r.question.attendu_slug})` : "";
      lignes.push(`  ${r.statut === "partielle" ? "~" : "✗"} ${NOMS_BLOCS[bloc]} — « ${r.question.question} » → ${r.obtenu}${attendu}`);
    }
  }
  for (const r of resultats.pieges) {
    if (r.jugement.statut === "reussie") continue;
    lignes.push(`  ✗ piège (${r.question.piege}) — « ${r.question.question} » → ${r.obtenu} : ${r.jugement.raison ?? "échec"}`);
  }
  for (const r of resultats.repetition) {
    if (r.stable) continue;
    lignes.push(`  ✗ répétition — « ${r.question} » : réponses différentes (${r.slugs.join(", ") || "aucune démarche"})`);
  }
  return lignes;
}
