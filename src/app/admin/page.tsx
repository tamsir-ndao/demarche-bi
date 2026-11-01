import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { pourcent, type Jour, type Tableau } from "@/lib/admin/donnees";
import { estConnecte, tableauAdmin } from "@/lib/admin/serveur";
import { deconnexion } from "./actions";
import { Connexion } from "./Connexion";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const jourCourt = (jour: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${jour}T00:00:00Z`));
const moment = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));

function Chiffre({ titre, valeur, detail }: { titre: string; valeur: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <p className="text-[13px] leading-[18px] font-semibold text-ink-2">{titre}</p>
      <p className="mt-1 text-[30px] leading-9 font-bold tracking-[-0.01em]">{valeur}</p>
      {detail && <p className="mt-0.5 text-[13px] leading-[18px] text-ink-2">{detail}</p>}
    </div>
  );
}

function Bloc({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[20px] leading-7 font-bold">{titre}</h2>
      {sousTitre && <p className="text-[14px] leading-5 text-ink-2">{sousTitre}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Courbe({ jours }: { jours: Jour[] }) {
  const max = Math.max(1, ...jours.map(({ questions }) => questions));
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between text-[13px] leading-[18px] text-ink-2">
        <span>Questions par jour</span>
        <span>Maximum : {nombre(max)}</span>
      </div>
      <div className="mt-3 flex h-40 items-end gap-[2px] border-b border-line">
        {jours.map(({ jour, questions }) => (
          <div key={jour} tabIndex={0} aria-label={`${jourCourt(jour)} : ${questions} question(s)`} className="group relative flex h-full min-w-0 flex-1 items-end">
            {questions > 0 && <span className="block w-full rounded-t-[4px] bg-brand" style={{ height: `${(questions / max) * 100}%` }} />}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-page px-2 py-1 text-[12px] leading-4 whitespace-nowrap shadow group-hover:block group-focus:block">
              {jourCourt(jour)} : {questions}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] leading-4 text-ink-2">
        <span>{jourCourt(jours[0]?.jour ?? "")}</span>
        <span>{jourCourt(jours.at(-1)?.jour ?? "")}</span>
      </div>
    </div>
  );
}

function Tableaux({ t }: { t: Tableau }) {
  const max = Math.max(1, ...t.demarches.map(({ questions }) => questions));
  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Chiffre titre="Aujourd’hui" valeur={nombre(t.aujourdhui)} detail="questions" />
        <Chiffre titre="7 derniers jours" valeur={nombre(t.sept)} detail="questions" />
        <Chiffre titre="30 derniers jours" valeur={nombre(t.trente)} detail="questions" />
        <Chiffre titre="Depuis le début" valeur={nombre(t.depuisLeDebut)} detail={t.premierJour ? `depuis le ${jourCourt(t.premierJour)}` : "questions"} />
        <Chiffre titre="Utilisateurs sur 7 jours" valeur={nombre(t.appareils7)} detail="téléphones différents" />
        <Chiffre titre="Utilisateurs sur 30 jours" valeur={nombre(t.appareils30)} detail={`dont ${nombre(t.revenants30)} revenus un autre jour`} />
        <Chiffre titre="Réponses trouvées" valeur={`${pourcent(t.repondues30, t.trente)} %`} detail={`voix : ${pourcent(t.voix30, t.trente)} % des questions`} />
        <Chiffre titre="Passages vers e-Sénégal" valeur={nombre(t.esenegal30)} detail="sur 30 jours" />
      </div>
      <p className="mt-3 text-[13px] leading-[18px] text-ink-2">
        Les utilisateurs et la part de voix ne comptent que depuis la mise en ligne de ce back-office.
      </p>

      <Bloc titre="Usage sur 30 jours">
        <Courbe jours={t.parJour} />
        <details className="mt-2">
          <summary className="cursor-pointer text-[14px] leading-6 font-semibold text-leaf">Voir les chiffres par jour</summary>
          <table className="mt-2 w-full text-left text-[14px] leading-6">
            <thead><tr className="text-ink-2"><th className="font-semibold">Jour</th><th className="text-right font-semibold">Questions</th></tr></thead>
            <tbody>
              {[...t.parJour].reverse().map(({ jour, questions }) => (
                <tr key={jour} className="border-t border-line"><td>{jourCourt(jour)}</td><td className="text-right">{questions}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </Bloc>

      <Bloc titre="Démarches les plus demandées" sousTitre="Sur 30 jours">
        {t.demarches.length === 0 ? <p className="text-[15px] text-ink-2">Pas encore de données.</p> : (
          <ul className="flex flex-col gap-3 rounded-2xl bg-card p-4">
            {t.demarches.map(({ slug, questions }) => (
              <li key={slug}>
                <div className="flex justify-between gap-3 text-[14px] leading-5"><span className="min-w-0 break-words">{slug}</span><span className="font-semibold">{questions}</span></div>
                <div className="mt-1 h-2 rounded-full bg-tint"><div className="h-2 rounded-full bg-brand" style={{ width: `${(questions / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </Bloc>

      <Bloc titre="Questions sans réponse" sousTitre="Sur 30 jours : les fiches à ajouter en priorité. Les salutations et les sujets hors démarches y figurent aussi.">
        {t.sansReponse.length === 0 ? <p className="text-[15px] text-ink-2">Aucune pour l’instant.</p> : (
          <ul className="divide-y divide-line rounded-2xl bg-card">
            {t.sansReponse.map(({ question, fois }) => (
              <li key={question} className="flex justify-between gap-3 px-4 py-2.5 text-[14px] leading-5"><span className="min-w-0 break-words">{question}</span><span className="flex-none font-semibold">{fois}×</span></li>
            ))}
          </ul>
        )}
      </Bloc>

      <Bloc titre="Dernières questions" sousTitre="Confidentiel : ne partage pas cet écran. Heures en UTC, l’heure du Sénégal.">
        {t.dernieres.length === 0 ? <p className="text-[15px] text-ink-2">Aucune pour l’instant.</p> : (
          <ul className="divide-y divide-line rounded-2xl bg-card">
            {t.dernieres.map(({ quand, question, repondue, voix, demarche }, i) => (
              <li key={`${quand}-${i}`} className="px-4 py-2.5">
                <p className="text-[14px] leading-5 break-words">{question}</p>
                <p className="mt-0.5 text-[12px] leading-4 break-words text-ink-2">
                  {moment(quand)} · {voix ? "voix" : "écrit"} · {repondue ? (demarche ?? "répondue") : "sans réponse"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bloc>
    </>
  );
}

async function Contenu() {
  if (!(await estConnecte())) return <Connexion />;

  const tableau = await tableauAdmin();

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.01em]">Administration</h1>
        <div className="flex items-center gap-2">
          {/* Une adresse à télécharger, pas une page : le lien de Next ne convient pas. */}
          <a href="/admin/export" download className="press flex min-h-11 items-center rounded-full bg-tint px-4 text-[14px] leading-5 font-semibold">Exporter (CSV)</a>
          <form action={deconnexion}>
            <button type="submit" className="press min-h-11 rounded-full px-4 text-[14px] leading-5 font-semibold text-ink-2">Se déconnecter</button>
          </form>
        </div>
      </div>
      {tableau ? <Tableaux t={tableau} /> : <p role="status" className="mt-6 text-[15px] leading-[22px] text-ink-2">Les chiffres sont indisponibles : la base de données ne répond pas.</p>}
    </>
  );
}

export default function Page() {
  return (
    <main id="contenu" className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-10 lg:px-6">
      <Suspense fallback={<p role="status" className="mt-16 text-center text-[15px] text-ink-2">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}
