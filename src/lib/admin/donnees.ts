import type { Requete } from "../avis/journal";

// Les chiffres du back-office, lus dans le journal (90 jours) et les totaux par jour (sans limite). Jours en UTC, l'heure
// du Sénégal. Serveur uniquement.

const JOUR_MS = 86_400_000;

export type Jour = { jour: string; questions: number };
export type LigneExport = { jour: string; questions: number; repondues: number; voix: number; appareils: number; esenegal: number };

export type Tableau = {
  aujourdhui: number;
  sept: number;
  trente: number;
  depuisLeDebut: number;
  premierJour: string | null;
  repondues30: number;
  voix30: number;
  appareils7: number;
  appareils30: number;
  revenants30: number;
  esenegal30: number;
  parJour: Jour[];
  demarches: { slug: string; questions: number }[];
  sansReponse: { question: string; fois: number }[];
  dernieres: { quand: string; question: string; repondue: boolean; voix: boolean; demarche: string | null }[];
};

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
              count(*) filter (where channel = 'voice')::int as voice, count(distinct device_id)::int as devices
       from question_logs where created_at >= $1 and created_at < $2 group by 1
     ), e as (
       select (created_at at time zone 'UTC')::date as day, count(*)::int as esenegal
       from usage_events where kind = 'esenegal' and created_at >= $1 and created_at < $2 group by 1
     )
     insert into usage_daily (day, questions, answered, voice, devices, esenegal)
     select coalesce(q.day, e.day), coalesce(q.questions, 0), coalesce(q.answered, 0), coalesce(q.voice, 0), coalesce(q.devices, 0), coalesce(e.esenegal, 0)
     from q full join e on q.day = e.day
     on conflict (day) do update set questions = excluded.questions, answered = excluded.answered, voice = excluded.voice,
       devices = excluded.devices, esenegal = excluded.esenegal`,
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
  const il30 = new Date(debutDuJour(maintenantMs) - 29 * JOUR_MS).toISOString();

  const [chiffres, revenants, clics, total, parJour, demarches, sansReponse, dernieres] = await Promise.all([
    requete(
      `select count(*) filter (where created_at >= $1)::int as aujourdhui, count(*) filter (where created_at >= $2)::int as sept,
              count(*)::int as trente, count(*) filter (where answered)::int as repondues, count(*) filter (where channel = 'voice')::int as voix,
              count(distinct device_id) filter (where created_at >= $2)::int as appareils7, count(distinct device_id)::int as appareils30
       from question_logs where created_at >= $3`,
      [auj, il7, il30],
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
    requete(
      "select unnest(fiche_slugs) as slug, count(*)::int as questions from question_logs where created_at >= $1 group by 1 order by 2 desc, 1 limit 10",
      [il30],
    ),
    requete(
      "select min(question) as question, count(*)::int as fois from question_logs where created_at >= $1 and not answered group by lower(question) order by 2 desc, 1 limit 20",
      [il30],
    ),
    requete(
      "select created_at as quand, question, answered as repondue, channel = 'voice' as voix, fiche_slugs[1] as demarche from question_logs order by created_at desc limit 30",
      [],
    ),
  ]);

  const c = lignes<Record<string, number>>(chiffres)[0] ?? {};
  const t = lignes<{ n?: number; premier?: string | null }>(total)[0];
  const nombre = (resultat: unknown) => lignes<{ n?: number }>(resultat)[0]?.n ?? 0;
  return {
    aujourdhui: c.aujourdhui ?? 0,
    sept: c.sept ?? 0,
    trente: c.trente ?? 0,
    depuisLeDebut: t?.n ?? 0,
    premierJour: t?.premier ?? null,
    repondues30: c.repondues ?? 0,
    voix30: c.voix ?? 0,
    appareils7: c.appareils7 ?? 0,
    appareils30: c.appareils30 ?? 0,
    revenants30: nombre(revenants),
    esenegal30: nombre(clics),
    parJour: completerLesJours(lignes<Jour>(parJour), maintenantMs),
    demarches: lignes(demarches),
    sansReponse: lignes(sansReponse),
    dernieres: lignes<Tableau["dernieres"][number]>(dernieres).map((ligne) => ({ ...ligne, quand: new Date(ligne.quand).toISOString() })),
  };
}

/** Les totaux par jour, à joindre à un dossier : aucun texte de question, aucun code de téléphone. */
export async function lireExport(requete: Requete, maintenantMs: number): Promise<LigneExport[]> {
  await agreger(requete, maintenantMs);
  return lignes<LigneExport>(
    await requete(
      "select day::text as jour, questions, answered as repondues, voice as voix, devices as appareils, esenegal from usage_daily order by day",
      [],
    ),
  );
}

export function enCsv(liste: LigneExport[]): string {
  const entete = "jour,questions,repondues,voix,appareils,clics_esenegal";
  return [entete, ...liste.map((l) => [l.jour, l.questions, l.repondues, l.voix, l.appareils, l.esenegal].join(","))].join("\n") + "\n";
}

/** Une part en pourcentage, arrondie ; zéro s'il n'y a rien à diviser. */
export function pourcent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
