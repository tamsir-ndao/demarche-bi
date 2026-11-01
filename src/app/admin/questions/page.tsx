import type { Metadata } from "next";
import Link from "next/link";
import { lireFiltres, lireQuestions, type FiltresQuestions } from "@/lib/admin/donnees";
import { lireAdmin } from "@/lib/admin/serveur";
import { ficheAffichable } from "@/lib/fiches/disponibles";
import { Cadre, Carte, Indisponible, Vide } from "../Cadre";

export const metadata: Metadata = { title: "Questions", robots: { index: false, follow: false } };

const moment = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));

const RESULTATS: Record<string, string> = { inconnue: "Démarche qui manque", hors_domaine: "Hors démarches", interdit: "Refusée" };

function adresse({ canal, reponse }: FiltresQuestions) {
  const parametres = new URLSearchParams({ ...(canal ? { canal } : {}), ...(reponse ? { reponse } : {}) }).toString();
  return parametres ? `/admin/questions?${parametres}` : "/admin/questions";
}

function Filtre({ href, actif, children }: { href: string; actif: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={actif ? "true" : undefined}
      className={`flex min-h-11 flex-none items-center rounded-full px-3.5 text-[14px] leading-5 font-semibold ${actif ? "bg-brand text-on-brand" : "bg-card"}`}
    >
      {children}
    </Link>
  );
}

function Filtres({ filtres }: { filtres: FiltresQuestions }) {
  return (
    <div className="mb-3 flex flex-col gap-2 lg:mb-4 lg:flex-row lg:gap-6">
      <div role="group" aria-label="Filtrer par canal" className="flex flex-wrap gap-1.5">
        <Filtre href={adresse({ ...filtres, canal: undefined })} actif={!filtres.canal}>Tout</Filtre>
        <Filtre href={adresse({ ...filtres, canal: "voice" })} actif={filtres.canal === "voice"}>Voix</Filtre>
        <Filtre href={adresse({ ...filtres, canal: "text" })} actif={filtres.canal === "text"}>Écrit</Filtre>
      </div>
      <div role="group" aria-label="Filtrer par résultat" className="flex flex-wrap gap-1.5">
        <Filtre href={adresse({ ...filtres, reponse: undefined })} actif={!filtres.reponse}>Tout</Filtre>
        <Filtre href={adresse({ ...filtres, reponse: "oui" })} actif={filtres.reponse === "oui"}>Avec réponse</Filtre>
        <Filtre href={adresse({ ...filtres, reponse: "non" })} actif={filtres.reponse === "non"}>Sans réponse</Filtre>
      </div>
    </div>
  );
}

async function Donnees({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtres = lireFiltres(await searchParams);
  const questions = await lireAdmin((requete) => lireQuestions(requete, filtres));
  if (!questions) return <Indisponible />;
  return (
    <>
      <Filtres filtres={filtres} />
      <Carte titre="Les 100 dernières">
        {questions.length === 0 ? <Vide>Aucune question pour ce choix.</Vide> : (
          <ul data-confidentiel className="divide-y divide-line">
            {questions.map(({ quand, question, type, voix, demarche }, i) => (
              <li key={`${quand}-${i}`} className="grid gap-x-4 gap-y-0.5 py-2.5 text-[14px] leading-5 lg:grid-cols-[1fr_230px_60px_120px]">
                <span className="min-w-0 break-words">{question}</span>
                <span className="min-w-0 text-[13px] break-words text-ink-2">{demarche ? (ficheAffichable(demarche)?.titre ?? demarche) : (RESULTATS[type ?? ""] ?? "Sans réponse")}</span>
                <span className="text-[13px] text-ink-2">{voix ? "Voix" : "Écrit"}</span>
                <span className="text-[13px] text-ink-2 lg:text-right">{moment(quand)}</span>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Cadre actif="questions" titre="Questions" sousTitre="Confidentiel : ne partage pas cet écran. Heures en UTC, l’heure du Sénégal.">
      <Donnees searchParams={searchParams} />
    </Cadre>
  );
}
