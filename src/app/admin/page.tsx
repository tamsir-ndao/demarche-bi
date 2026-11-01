import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { evolution, lireTableau, pourcent, type Jour, type Tableau } from "@/lib/admin/donnees";
import { lireAdmin } from "@/lib/admin/serveur";
import { ficheAffichable } from "@/lib/fiches/disponibles";
import { Cadre, Carte, Indisponible, Vide } from "./Cadre";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const jourCourt = (jour: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${jour}T00:00:00Z`));
const titreDe = (slug: string) => ficheAffichable(slug)?.titre ?? slug;

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
  const max = Math.max(2, ...jours.map(({ questions }) => questions));
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

function VoirTout({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="mt-3 flex min-h-11 items-center gap-1.5 text-[14px] leading-5 font-semibold text-leaf">
      {children}
      <Icon name="fleche-droite" size={16} />
    </Link>
  );
}

function Vue({ t }: { t: Tableau }) {
  const maxDemarche = Math.max(1, ...t.demarches.map(({ questions }) => questions));
  const hier = t.parJour.at(-2)?.questions ?? 0;
  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Indicateur icone="bulle" titre="Questions, 7 jours" valeur={nombre(t.sept)} detail={`${evolution(t.sept, t.septPrecedents)} par rapport aux 7 jours d’avant`} />
        <Indicateur icone="personnes" titre="Utilisateurs, 7 jours" valeur={nombre(t.appareils7)} detail={`${nombre(t.appareils30)} sur 30 jours`} />
        <Indicateur icone="coche" titre="Réponses trouvées" valeur={`${pourcent(t.repondues30, t.repondues30 + t.inconnues30)} %`} detail="démarches demandées, sur 30 jours" />
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
          {t.premierJour && <p className="mt-2 text-[12px] leading-4 text-ink-2">Premier jour compté : {jourCourt(t.premierJour)}</p>}
          <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
            <Mesure libelle="Questions à la voix" part={pourcent(t.voix30, t.trente)} detail={`${nombre(t.voix30)} sur ${nombre(t.trente)}, sur 30 jours`} />
            <Mesure libelle="Utilisateurs revenus" part={pourcent(t.revenants30, t.appareils30)} detail={`${nombre(t.revenants30)} sur ${nombre(t.appareils30)}, un autre jour`} />
          </div>
        </Carte>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <Carte titre="Démarches les plus demandées" sousTitre="Les 5 premières, sur 30 jours">
          {t.demarches.length === 0 ? <Vide>Pas encore de données.</Vide> : (
            <ul className="flex flex-col gap-3.5">
              {t.demarches.map(({ slug, questions }) => (
                <li key={slug}>
                  <div className="flex justify-between gap-3 text-[14px] leading-5"><span className="min-w-0 break-words">{titreDe(slug)}</span><span className="font-semibold">{questions}</span></div>
                  <div className="mt-1.5 h-2 rounded-full bg-tint"><div className="h-2 rounded-full bg-brand" style={{ width: `${(questions / maxDemarche) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <VoirTout href="/admin/demarches">Voir toutes les démarches</VoirTout>
        </Carte>
        <Carte titre="Démarches qui manquent" sousTitre="Demandes sans fiche, sur 30 jours">
          <p className="text-[38px] leading-[44px] font-bold tracking-[-0.02em]">{nombre(t.inconnues30)}</p>
          <p className="mt-1 text-[14px] leading-5 text-ink-2">Ce sont les fiches à écrire en priorité.</p>
          <VoirTout href="/admin/sans-reponse">Voir ces questions</VoirTout>
        </Carte>
      </div>
    </div>
  );
}

async function Donnees() {
  const tableau = await lireAdmin(lireTableau);
  return tableau ? <Vue t={tableau} /> : <Indisponible />;
}

export default function Page() {
  return (
    <Cadre actif="ensemble" titre="Vue d’ensemble">
      <Suspense fallback={<p role="status" className="text-[15px] text-ink-2">Chargement…</p>}>
        <Donnees />
      </Suspense>
    </Cadre>
  );
}
