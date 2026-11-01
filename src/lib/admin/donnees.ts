import type { Requete } from "../avis/journal";

// Les chiffres du back-office, lus dans le journal (90 jours) et les totaux par jour (sans limite). Jours en UTC, l'heure
// du Sénégal. Serveur uniquement.

const JOUR_MS = 86_400_000;

export type Jour = { jour: string; questions: number };
export type LigneExport = { jour: string; questions: number; repondues: number; voix: number; appareils: number; esenegal: number; sansReponse: number };

export type Tableau = {
  aujourdhui: number;
  sept: number;
  /** Les 7 jours d'avant, pour comparer. */
  septPrecedents: number;
  trente: number;
  depuisLeDebut: number;
  premierJour: string | null;
  repondues30: number;
  /** Les démarches demandées et inconnues : les sujets hors démarches ne comptent pas contre le service. */
  inconnues30: number;
  voix30: number;
  appareils7: number;
  appareils30: number;
  revenants30: number;
  esenegal30: number;
  parJour: Jour[];
  demarches: LigneDemarche[];
};

export type LigneDemarche = { slug: string; questions: number; passages: number };
export type LigneSansReponse = { question: string; fois: number };
export type LigneQuestion = { quand: string; question: string; type: string | null; voix: boolean; demarche: string | null };
export type FiltresQuestions = { canal?: "voice" | "text"; reponse?: "oui" | "non" };

/** Ne garde des paramètres d'adresse que les valeurs prévues. */
export function lireFiltres(parametres: Record<string, string | string[] | undefined>): FiltresQuestions {
  const { canal, reponse } = parametres;
  return { ...(canal === "voice" || canal === "text" ? { canal } : {}), ...(reponse === "oui" || reponse === "non" ? { reponse } : {}) };
}

const lignes = <T>(resultat: unknown) => (Array.isArray(resultat) ? (resultat as T[]) : []);
const debutDuJour = (ms: number) => Math.floor(ms / JOUR_MS) * JOUR_MS;

/** Recalcule les totaux des jours terminés encore présents dans le journal. Peut être relancé sans risque. */
export async function agreger(requete: Requete, maintenantMs: number): Promise<void> {
  const fin = new Date(debutDuJour(maintenantMs)).toISOString();
  // 89 jours : à 90, la purge a déjà pu retirer une partie de la journée, et le total serait faussé.
  const debut = new Date(debutDuJour(maintenantMs) - 89 * JOUR_MS).toISOString();
  await requete(
    `with q as (
       select (created_at at time zone 'UTC')::date as day, count(*)::int as questions, count(*) filter (where answered)::int as answered,
              count(*) filter (where channel = 'voice')::int as voice, count(distinct device_id)::int as devices,
              count(*) filter (where answer_type = 'inconnue')::int as unknown
       from question_logs where created_at >= $1 and created_at < $2 group by 1
     ), e as (
       select (created_at at time zone 'UTC')::date as day, count(*)::int as esenegal
       from usage_events where kind = 'esenegal' and created_at >= $1 and created_at < $2 group by 1
     )
     insert into usage_daily (day, questions, answered, voice, devices, esenegal, unknown)
     select coalesce(q.day, e.day), coalesce(q.questions, 0), coalesce(q.answered, 0), coalesce(q.voice, 0), coalesce(q.devices, 0), coalesce(e.esenegal, 0), coalesce(q.unknown, 0)
     from q full join e on q.day = e.day
     on conflict (day) do update set questions = excluded.questions, answered = excluded.answered, voice = excluded.voice,
       devices = excluded.devices, esenegal = excluded.esenegal, unknown = excluded.unknown`,
    [debut, fin],
  );
  await requete(
    `insert into usage_daily_fiches (day, fiche_slug, questions)
     select (created_at at time zone 'UTC')::date, unnest(fiche_slugs), count(*)::int
     from question_logs where created_at >= $1 and created_at < $2 group by 1, 2
     on conflict (day, fiche_slug) do update set questions = excluded.questions`,
    [debut, fin],
  );
}

/** Supprime les passages vers e-Sénégal de plus de 90 jours (leurs totaux restent). */
export async function purgerEvenements(requete: Requete, maintenantMs: number): Promise<void> {
  await requete("delete from usage_events where created_at < $1", [new Date(maintenantMs - 90 * JOUR_MS).toISOString()]);
}

/** Les 30 derniers jours, jusqu'à aujourd'hui compris : un jour sans question vaut zéro. */
export function completerLesJours(trouves: Jour[], maintenantMs: number): Jour[] {
  const parDate = new Map(trouves.map(({ jour, questions }) => [jour, questions]));
  return Array.from({ length: 30 }, (_, i) => {
    const jour = new Date(debutDuJour(maintenantMs) - (29 - i) * JOUR_MS).toISOString().slice(0, 10);
    return { jour, questions: parDate.get(jour) ?? 0 };
  });
}

export async function lireTableau(requete: Requete, maintenantMs: number): Promise<Tableau> {
  await agreger(requete, maintenantMs);
  const auj = new Date(debutDuJour(maintenantMs)).toISOString();
  const il7 = new Date(debutDuJour(maintenantMs) - 6 * JOUR_MS).toISOString();
  const il14 = new Date(debutDuJour(maintenantMs) - 13 * JOUR_MS).toISOString();
  const il30 = new Date(debutDuJour(maintenantMs) - 29 * JOUR_MS).toISOString();

  const [chiffres, revenants, clics, total, parJour, demarches] = await Promise.all([
    requete(
      `select count(*) filter (where created_at >= $1)::int as aujourdhui, count(*) filter (where created_at >= $2)::int as sept,
              count(*) filter (where created_at >= $4 and created_at < $2)::int as sept_precedents,
              count(*)::int as trente, count(*) filter (where answered)::int as repondues, count(*) filter (where answer_type = 'inconnue')::int as inconnues, count(*) filter (where channel = 'voice')::int as voix,
              count(distinct device_id) filter (where created_at >= $2)::int as appareils7, count(distinct device_id)::int as appareils30
       from question_logs where created_at >= $3`,
      [auj, il7, il30, il14],
    ),
    requete(
      `select count(*)::int as n from (select device_id from question_logs where created_at >= $1 and device_id is not null
       group by device_id having count(distinct (created_at at time zone 'UTC')::date) >= 2) r`,
      [il30],
    ),
    requete("select count(*)::int as n from usage_events where kind = 'esenegal' and created_at >= $1", [il30]),
    // Les totaux des jours terminés, plus ce qui n'y est pas encore (aujourd'hui).
    requete(
      `select (select coalesce(sum(questions), 0)::int from usage_daily where day < $1::date)
              + (select count(*)::int from question_logs where created_at >= $1) as n,
              (select min(day)::text from usage_daily) as premier`,
      [auj],
    ),
    requete(
      "select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as jour, count(*)::int as questions from question_logs where created_at >= $1 group by 1",
      [il30],
    ),
    lireDemarches(requete, maintenantMs, 5),
  ]);

  const c = lignes<Record<string, number>>(chiffres)[0] ?? {};
  const t = lignes<{ n?: number; premier?: string | null }>(total)[0];
  const nombre = (resultat: unknown) => lignes<{ n?: number }>(resultat)[0]?.n ?? 0;
  return {
    aujourdhui: c.aujourdhui ?? 0,
    sept: c.sept ?? 0,
    septPrecedents: c.sept_precedents ?? 0,
    trente: c.trente ?? 0,
    depuisLeDebut: t?.n ?? 0,
    premierJour: t?.premier ?? null,
    repondues30: c.repondues ?? 0,
    inconnues30: c.inconnues ?? 0,
    voix30: c.voix ?? 0,
    appareils7: c.appareils7 ?? 0,
    appareils30: c.appareils30 ?? 0,
    revenants30: nombre(revenants),
    esenegal30: nombre(clics),
    parJour: completerLesJours(lignes<Jour>(parJour), maintenantMs),
    demarches,
  };
}

const debut30 = (maintenantMs: number) => new Date(debutDuJour(maintenantMs) - 29 * JOUR_MS).toISOString();

/** Les démarches demandées sur 30 jours, avec leurs passages vers e-Sénégal. */
export async function lireDemarches(requete: Requete, maintenantMs: number, limite = 100): Promise<LigneDemarche[]> {
  return lignes<LigneDemarche>(
    await requete(
      `with q as (select unnest(fiche_slugs) as slug, count(*)::int as questions from question_logs where created_at >= $1 group by 1),
            e as (select fiche_slug as slug, count(*)::int as passages from usage_events where kind = 'esenegal' and created_at >= $1 and fiche_slug is not null group by 1)
       select q.slug, q.questions, coalesce(e.passages, 0) as passages from q left join e on q.slug = e.slug order by q.questions desc, q.slug limit $2`,
      [debut30(maintenantMs), limite],
    ),
  );
}

/** Les questions sans réponse sur 30 jours, regroupées : les démarches qui manquent, puis les sujets hors démarches. */
export async function lireSansReponse(requete: Requete, maintenantMs: number): Promise<{ manques: LigneSansReponse[]; horsSujet: LigneSansReponse[] }> {
  const groupe = (types: string[]) =>
    requete(
      "select min(question) as question, count(*)::int as fois from question_logs where created_at >= $1 and answer_type = any($2) group by lower(question) order by 2 desc, 1 limit 100",
      [debut30(maintenantMs), types],
    );
  const [manques, horsSujet] = await Promise.all([groupe(["inconnue"]), groupe(["hors_domaine", "interdit"])]);
  return { manques: lignes(manques), horsSujet: lignes(horsSujet) };
}

/** Les 100 dernières questions, selon les filtres. Les valeurs passent toujours en paramètres de la requête. */
export async function lireQuestions(requete: Requete, { canal, reponse }: FiltresQuestions): Promise<LigneQuestion[]> {
  const liste = await requete(
    `select created_at as quand, question, answer_type as type, channel = 'voice' as voix, fiche_slugs[1] as demarche from question_logs
     where ($1::text is null or channel = $1) and ($2::boolean is null or answered = $2)
     order by created_at desc limit 100`,
    [canal ?? null, reponse === undefined ? null : reponse === "oui"],
  );
  return lignes<LigneQuestion>(liste).map((ligne) => ({ ...ligne, quand: new Date(ligne.quand).toISOString() }));
}

/** Les totaux par jour, à joindre à un dossier : aucun texte de question, aucun code de téléphone. */
export async function lireExport(requete: Requete, maintenantMs: number): Promise<LigneExport[]> {
  await agreger(requete, maintenantMs);
  return lignes<LigneExport>(
    await requete(
      `select day::text as jour, questions, answered as repondues, voice as voix, devices as appareils, esenegal, unknown as "sansReponse" from usage_daily order by day`,
      [],
    ),
  );
}

export function enCsv(liste: LigneExport[]): string {
  const entete = "jour,questions,repondues,voix,appareils,clics_esenegal,demarches_inconnues";
  return [entete, ...liste.map((l) => [l.jour, l.questions, l.repondues, l.voix, l.appareils, l.esenegal, l.sansReponse].join(","))].join("\n") + "\n";
}

/** L'écart avec la période d'avant, en toutes lettres : « +3 », « −2 » ou « = ». */
export function evolution(actuel: number, avant: number): string {
  const ecart = actuel - avant;
  if (ecart === 0) return "=";
  return ecart > 0 ? `+${ecart}` : `−${-ecart}`;
}

/** Une part en pourcentage, arrondie ; zéro s'il n'y a rien à diviser. */
export function pourcent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
