import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { evolution, pourcent, type Jour, type Tableau } from "@/lib/admin/donnees";
import { estConnecte, tableauAdmin } from "@/lib/admin/serveur";
import { Icon, type IconName } from "@/components/Icon";
import { ficheAffichable } from "@/lib/fiches/disponibles";
import { deconnexion } from "./actions";
import { Connexion } from "./Connexion";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const jourCourt = (jour: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${jour}T00:00:00Z`));
const moment = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));
const titreDe = (slug: string) => ficheAffichable(slug)?.titre ?? slug;

const SECTIONS: { id: string; libelle: string; icone: IconName }[] = [
  { id: "ensemble", libelle: "Vue d’ensemble", icone: "bulle" },
  { id: "demarches", libelle: "Démarches", icone: "dossier" },
  { id: "manques", libelle: "Sans réponse", icone: "aide" },
  { id: "questions", libelle: "Questions", icone: "loupe" },
];

function Actions() {
  return (
    <>
      {/* Une adresse à télécharger, pas une page : le lien de Next ne convient pas. */}
      <a href="/admin/export" download className="press flex min-h-11 items-center justify-center rounded-full bg-brand px-4 text-[14px] leading-5 font-bold text-on-brand">
        Exporter en CSV
      </a>
      <form action={deconnexion}>
        <button type="submit" className="press min-h-11 w-full rounded-full px-4 text-[14px] leading-5 font-semibold text-ink-2">
          Se déconnecter
        </button>
      </form>
    </>
  );
}

function Marque() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex size-[34px] items-center justify-center rounded-[11px] bg-brand text-on-brand">
        <Icon name="coche" size={20} strokeWidth={3} />
      </span>
      <span className="text-[17px] leading-5 font-bold tracking-[-0.01em]">
        Démarche<span className="text-leaf">-Bi</span>
        <span className="block text-[12px] leading-4 font-medium tracking-normal text-ink-2">Administration</span>
      </span>
    </span>
  );
}

/** Colonne fixe sur ordinateur ; bandeau et onglets qui défilent sur téléphone. */
function Navigation() {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[240px] flex-none flex-col border-r border-line p-5 lg:flex">
        <Marque />
        <nav aria-label="Sections du tableau de bord" className="mt-8 flex flex-col gap-1">
          {SECTIONS.map(({ id, libelle, icone }) => (
            <a key={id} href={`#${id}`} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] leading-5 font-semibold text-ink-2 hover:bg-card">
              <Icon name={icone} size={19} />
              {libelle}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Actions />
        </div>
      </aside>
      <div className="sticky top-0 z-20 border-b border-line bg-page lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-2.5">
          <Marque />
          <form action={deconnexion}>
            <button type="submit" aria-label="Se déconnecter" className="press flex size-11 items-center justify-center rounded-full bg-card">
              <Icon name="croix" size={18} />
            </button>
          </form>
        </div>
        <nav aria-label="Sections du tableau de bord" className="flex gap-1.5 overflow-x-auto px-4 py-2">
          {SECTIONS.map(({ id, libelle }) => (
            <a key={id} href={`#${id}`} className="flex min-h-11 flex-none items-center rounded-full bg-card px-3.5 text-[14px] leading-5 font-semibold whitespace-nowrap">
              {libelle}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}

function Carte({ titre, sousTitre, className = "", children }: { titre: string; sousTitre?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl bg-card p-4 lg:p-5 ${className}`}>
      <h2 className="text-[16px] leading-[22px] font-bold">{titre}</h2>
      {sousTitre && <p className="mt-0.5 text-[13px] leading-[18px] text-ink-2">{sousTitre}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Indicateur({ icone, titre, valeur, detail }: { icone: IconName; titre: string; valeur: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card p-4 lg:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-[18px] font-semibold text-ink-2">{titre}</p>
        <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-lg bg-tint text-leaf">
          <Icon name={icone} size={17} />
        </span>
      </div>
      <p className="mt-1 text-[32px] leading-[38px] font-bold tracking-[-0.02em] lg:text-[38px] lg:leading-[44px]">{valeur}</p>
      <p className="mt-1 text-[13px] leading-[18px] text-ink-2">{detail}</p>
    </div>
  );
}

function Courbe({ jours }: { jours: Jour[] }) {
  const max = Math.max(1, ...jours.map(({ questions }) => questions));
  const reperes = [max, Math.round(max / 2), 0];
  return (
    <>
      <div className="flex gap-2">
        <div aria-hidden="true" className="flex h-44 flex-none flex-col justify-between text-right text-[12px] leading-4 text-ink-2 lg:h-56">
          {reperes.map((repere, i) => (
            <span key={`${repere}-${i}`} className={i === 1 ? "" : i === 0 ? "-mt-2" : "-mb-2"}>{nombre(repere)}</span>
          ))}
        </div>
        <div className="relative h-44 min-w-0 flex-1 border-b border-line lg:h-56">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-line opacity-50" />
          <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-line opacity-50" />
          <div className="relative flex h-full items-end gap-[2px]">
            {jours.map(({ jour, questions }) => (
              <div key={jour} tabIndex={0} aria-label={`${jourCourt(jour)} : ${questions} question(s)`} className="group relative flex h-full min-w-0 flex-1 items-end">
                {questions > 0 && <span className="block w-full rounded-t-[4px] bg-brand" style={{ height: `${(questions / max) * 100}%` }} />}
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg border border-line bg-page px-2 py-1 text-[12px] leading-4 whitespace-nowrap group-hover:block group-focus:block">
                  {jourCourt(jour)} : {questions}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex justify-between pl-8 text-[12px] leading-4 text-ink-2">
        <span>{jourCourt(jours[0]?.jour ?? "")}</span>
        <span>Aujourd’hui</span>
      </div>
      <details className="mt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-[14px] leading-5 font-semibold text-leaf">Voir les chiffres par jour</summary>
        <table className="mt-1 w-full text-left text-[14px] leading-6">
          <thead>
            <tr className="text-ink-2"><th className="font-semibold">Jour</th><th className="text-right font-semibold">Questions</th></tr>
          </thead>
          <tbody>
            {[...jours].reverse().map(({ jour, questions }) => (
              <tr key={jour} className="border-t border-line"><td>{jourCourt(jour)}</td><td className="text-right">{questions}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function Mesure({ libelle, part, detail }: { libelle: string; part: number; detail: string }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-[14px] leading-5">
        <span className="font-semibold">{libelle}</span>
        <span className="font-semibold">{part} %</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-tint"><div className="h-2 rounded-full bg-brand" style={{ width: `${part}%` }} /></div>
      <p className="mt-1 text-[12px] leading-4 text-ink-2">{detail}</p>
    </div>
  );
}

function Tableaux({ t }: { t: Tableau }) {
  const maxDemarche = Math.max(1, ...t.demarches.map(({ questions }) => questions));
  const hier = t.parJour.at(-2)?.questions ?? 0;
  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <div id="ensemble" className="grid scroll-mt-32 grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Indicateur icone="bulle" titre="Questions, 7 jours" valeur={nombre(t.sept)} detail={`${evolution(t.sept, t.septPrecedents)} par rapport aux 7 jours d’avant`} />
        <Indicateur icone="personnes" titre="Utilisateurs, 7 jours" valeur={nombre(t.appareils7)} detail={`${nombre(t.appareils30)} sur 30 jours`} />
        <Indicateur icone="coche" titre="Réponses trouvées" valeur={`${pourcent(t.repondues30, t.trente)} %`} detail="sur 30 jours" />
        <Indicateur icone="lien-externe" titre="Vers e-Sénégal" valeur={nombre(t.esenegal30)} detail="passages sur 30 jours" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        <Carte titre="Questions par jour" sousTitre="30 derniers jours" className="lg:col-span-2">
          <Courbe jours={t.parJour} />
        </Carte>
        <Carte titre="En bref">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
            {[
              ["Aujourd’hui", t.aujourdhui],
              ["Hier", hier],
              ["30 jours", t.trente],
              ["Depuis le début", t.depuisLeDebut],
            ].map(([libelle, valeur]) => (
              <div key={libelle}>
                <dt className="text-[13px] leading-[18px] text-ink-2">{libelle}</dt>
                <dd className="text-[24px] leading-[30px] font-bold">{nombre(valeur as number)}</dd>
              </div>
            ))}
          </dl>
          {t.premierJour && <p className="mt-2 text-[12px] leading-4 text-ink-2">Première question : {jourCourt(t.premierJour)}</p>}
          <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
            <Mesure libelle="Questions à la voix" part={pourcent(t.voix30, t.trente)} detail={`${nombre(t.voix30)} sur ${nombre(t.trente)}, sur 30 jours`} />
            <Mesure libelle="Utilisateurs revenus" part={pourcent(t.revenants30, t.appareils30)} detail={`${nombre(t.revenants30)} sur ${nombre(t.appareils30)}, un autre jour`} />
          </div>
          <p className="mt-4 text-[12px] leading-4 text-ink-2">Utilisateurs, voix et passages comptés depuis le 1er novembre 2026.</p>
        </Carte>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <div id="demarches" className="min-w-0 scroll-mt-32">
          <Carte titre="Démarches les plus demandées" sousTitre="30 derniers jours" className="h-full">
            {t.demarches.length === 0 ? <p className="text-[15px] text-ink-2">Pas encore de données.</p> : (
              <ul className="flex flex-col gap-3.5">
                {t.demarches.map(({ slug, questions }) => (
                  <li key={slug}>
                    <div className="flex justify-between gap-3 text-[14px] leading-5"><span className="min-w-0 break-words">{titreDe(slug)}</span><span className="font-semibold">{questions}</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-tint"><div className="h-2 rounded-full bg-brand" style={{ width: `${(questions / maxDemarche) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </div>
        <div id="manques" className="min-w-0 scroll-mt-32">
          <Carte titre="Questions sans réponse" sousTitre="Les fiches à ajouter. Salutations et sujets hors démarches inclus." className="h-full">
            {t.sansReponse.length === 0 ? <p className="text-[15px] text-ink-2">Aucune pour l’instant.</p> : (
              <ul data-confidentiel className="max-h-[420px] divide-y divide-line overflow-y-auto">
                {t.sansReponse.map(({ question, fois }) => (
                  <li key={question} className="flex justify-between gap-3 py-2.5 text-[14px] leading-5"><span className="min-w-0 break-words">{question}</span><span className="flex-none font-semibold">{fois}×</span></li>
                ))}
              </ul>
            )}
          </Carte>
        </div>
      </div>

      <div id="questions" className="scroll-mt-32">
        <Carte titre="Dernières questions" sousTitre="Confidentiel : ne partage pas cet écran. Heures en UTC, l’heure du Sénégal.">
          {t.dernieres.length === 0 ? <p className="text-[15px] text-ink-2">Aucune pour l’instant.</p> : (
            <ul data-confidentiel tabIndex={0} aria-label="Dernières questions" className="max-h-[520px] divide-y divide-line overflow-y-auto">
              {t.dernieres.map(({ quand, question, repondue, voix, demarche }, i) => (
                <li key={`${quand}-${i}`} className="grid gap-x-4 gap-y-0.5 py-2.5 text-[14px] leading-5 lg:grid-cols-[1fr_220px_120px_110px]">
                  <span className="min-w-0 break-words">{question}</span>
                  <span className="min-w-0 break-words text-[13px] text-ink-2">{repondue ? (demarche ? titreDe(demarche) : "Répondue") : "Sans réponse"}</span>
                  <span className="text-[13px] text-ink-2">{voix ? "Voix" : "Écrit"}</span>
                  <span className="text-[13px] text-ink-2 lg:text-right">{moment(quand)}</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>
    </div>
  );
}

async function Contenu() {
  if (!(await estConnecte())) {
    return (
      <main id="contenu" className="w-full flex-1 px-4">
        <Connexion />
      </main>
    );
  }

  const tableau = await tableauAdmin();

  return (
    <div className="flex min-h-dvh w-full flex-col lg:flex-row">
      <Navigation />
      <main id="contenu" className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 px-4 pt-4 pb-10 lg:px-8 lg:pt-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:mb-6">
          <h1 className="text-[26px] leading-8 font-bold tracking-[-0.01em] lg:text-[30px] lg:leading-9">Tableau de bord</h1>
          <a href="/admin/export" download className="press flex min-h-11 items-center rounded-full bg-tint px-4 text-[14px] leading-5 font-semibold lg:hidden">
            Exporter en CSV
          </a>
        </div>
        {tableau ? <Tableaux t={tableau} /> : <p role="status" className="text-[15px] leading-[22px] text-ink-2">Les chiffres sont indisponibles : la base de données ne répond pas.</p>}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p role="status" className="mt-16 w-full text-center text-[15px] text-ink-2">Chargement…</p>}>
      <Contenu />
    </Suspense>
  );
}
