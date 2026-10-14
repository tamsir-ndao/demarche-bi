// Test statique : les mesures de fiabilité ne touchent jamais à la base Neon. Elles posent des questions de test au vrai
// modèle ; si elles passaient par le service du site, chaque essai serait noté dans le journal anonyme et fausserait les
// chiffres de la vraie vie. On lit donc le code (sans l'exécuter) : ce qu'il importe, ce qu'il appelle, ce qu'il retire de
// l'environnement. Lancer : npm test
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const racine = process.cwd();
const dossierEval = path.join(racine, "src", "lib", "eval");
const script = path.join(racine, "scripts", "fiabilite.ts");

/** Les modules de l'évaluation : tout `src/lib/eval/*.ts`, sans les tests. */
const modulesEval = fs
  .readdirSync(dossierEval)
  .filter((nom) => nom.endsWith(".ts") && !nom.endsWith(".test.ts"))
  .map((nom) => path.join(dossierEval, nom));

/** Le code sans ses commentaires : on ne juge pas ce qu'une phrase explique, seulement ce que le code fait. */
function sansCommentaires(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((ligne) => ligne.replace(/(^|\s)\/\/.*$/, "$1"))
    .join("\n");
}

const lire = (fichier: string) => sansCommentaires(fs.readFileSync(fichier, "utf8"));
const nom = (fichier: string) => path.relative(racine, fichier);

/** Les modules qu'un fichier importe (`import … from`, `import("…")`, `require("…")`, `export … from`). */
function importsDe(code: string): string[] {
  const motif = /\bfrom\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;
  return [...code.matchAll(motif)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4]);
}

/** Ce que le code de l'évaluation n'a aucune raison d'atteindre : la base, le service du site, le journal, les avis. */
const INTERDITS = [
  { motif: /(^|\/)avis(\/|$)/, nom: "le journal et les avis (src/lib/avis)" },
  { motif: /(^|\/)db$/, nom: "la base de données (src/lib/db)" },
  { motif: /^@neondatabase\//, nom: "Neon" },
  { motif: /^pg$/, nom: "pg" },
  { motif: /(^|\/)ai\/(serveur|service)$/, nom: "le service du site (cache, limite, journal)" },
  { motif: /^next(\/|$)/, nom: "Next.js (le script tourne hors du serveur)" },
];

/** Tout ce qu'un fichier atteint en suivant ses imports relatifs (lui compris). */
function fichiersAtteints(depart: string): string[] {
  const vus = new Set<string>();
  const aVisiter = [depart];
  while (aVisiter.length > 0) {
    const fichier = aVisiter.pop() as string;
    if (vus.has(fichier)) continue;
    vus.add(fichier);
    for (const specifieur of importsDe(lire(fichier))) {
      if (!specifieur.startsWith(".")) continue;
      const cible = path.resolve(path.dirname(fichier), specifieur);
      const candidat = [`${cible}.ts`, path.join(cible, "index.ts")].find((c) => fs.existsSync(c));
      if (candidat !== undefined) aVisiter.push(candidat);
    }
  }
  return [...vus];
}

const IDENTIFIANTS_INTERDITS = ["creerService", "creerJournal", "noterReponse", "noterAvis", "noterLaReponse", "getSql"];

describe("les mesures de fiabilité n'écrivent pas dans la base", () => {
  it("regarde bien le script et les modules de l'évaluation (le test ne passe pas à vide)", () => {
    assert.ok(fs.existsSync(script));
    assert.ok(modulesEval.length >= 10, `${modulesEval.length} modules`);
    for (const attendu of ["fiabilite.ts", "fidelite.ts", "enregistreur.ts", "parcours.ts", "repetition.ts", "pieges.ts"]) {
      assert.ok(modulesEval.some((m) => path.basename(m) === attendu), attendu);
    }
  });

  it("n'importe ni le journal, ni la base, ni Neon, ni le service du site, dans le script et dans l'évaluation", () => {
    for (const fichier of [script, ...modulesEval]) {
      for (const specifieur of importsDe(lire(fichier))) {
        const interdit = INTERDITS.find(({ motif }) => motif.test(specifieur));
        assert.equal(interdit, undefined, `${nom(fichier)} importe « ${specifieur} » : ${interdit?.nom}`);
      }
    }
  });

  it("n'atteint pas la base non plus par un module intermédiaire", () => {
    assert.ok(
      fichiersAtteints(script).some((fichier) => fichier.endsWith(path.join("ai", "ask.ts"))),
      "le parcours des imports atteint bien le parcours du site",
    );
    for (const depart of [script, ...modulesEval]) {
      for (const atteint of fichiersAtteints(depart)) {
        for (const specifieur of importsDe(lire(atteint))) {
          const interdit = INTERDITS.find(({ motif }) => motif.test(specifieur));
          assert.equal(interdit, undefined, `${nom(depart)} atteint ${nom(atteint)}, qui importe « ${specifieur} » : ${interdit?.nom}`);
        }
      }
    }
  });

  it("n'appelle ni le service du site, ni le journal, ni les avis", () => {
    for (const fichier of [script, ...modulesEval]) {
      const code = lire(fichier);
      for (const identifiant of IDENTIFIANTS_INTERDITS) {
        assert.ok(!new RegExp(`\\b${identifiant}\\b`).test(code), `${nom(fichier)} utilise ${identifiant}`);
      }
    }
  });

  it("ne lit jamais l'adresse de la base dans l'évaluation", () => {
    for (const fichier of modulesEval) {
      assert.ok(!lire(fichier).includes("DATABASE_URL"), nom(fichier));
    }
  });

  it("retire l'adresse de la base de l'environnement du script, aussitôt après le chargement de .env.local, et ne la cite pas autrement", () => {
    const code = lire(script);
    const mentions = code.match(/DATABASE_URL/g) ?? [];
    const retraits = code.match(/\bdelete\s+process\.env\.DATABASE_URL\b/g) ?? [];
    assert.equal(retraits.length, 1, "un seul retrait");
    assert.equal(mentions.length, retraits.length, "la seule mention est le retrait");

    const chargement = code.indexOf("loadEnvFile");
    assert.ok(chargement >= 0, "le script charge .env.local");
    assert.ok(code.indexOf("delete process.env.DATABASE_URL") > chargement, "le retrait vient après le chargement");
    // Rien d'autre ne s'intercale : ni import dynamique, ni appel au modèle entre le chargement et le retrait.
    const entreLesDeux = code.slice(chargement, code.indexOf("delete process.env.DATABASE_URL"));
    assert.ok(!/\b(?:poserQuestion|mesurerFiabilite|chatJson|import\()/.test(entreLesDeux));
  });

  it("pose les questions avec `poserQuestion`, comme le parcours du site mais sans son service", () => {
    assert.ok(/\bposerQuestion\b/.test(lire(path.join(dossierEval, "fiabilite.ts"))));
  });
});
