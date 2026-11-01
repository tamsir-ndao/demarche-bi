import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { estConnecte } from "@/lib/admin/serveur";
import { deconnexion } from "./actions";
import { Connexion } from "./Connexion";

// Le cadre des pages du back-office : la connexion, la navigation, le titre. Chaque lecture de chiffres revérifie la session (lireAdmin).

export type PageAdmin = "ensemble" | "demarches" | "sans-reponse" | "questions" | "avis";

const PAGES: { id: PageAdmin; href: string; libelle: string; icone: IconName }[] = [
  { id: "ensemble", href: "/admin", libelle: "Vue d’ensemble", icone: "bulle" },
  { id: "demarches", href: "/admin/demarches", libelle: "Démarches", icone: "dossier" },
  { id: "sans-reponse", href: "/admin/sans-reponse", libelle: "Sans réponse", icone: "aide" },
  { id: "questions", href: "/admin/questions", libelle: "Questions", icone: "loupe" },
  { id: "avis", href: "/admin/avis", libelle: "Avis", icone: "crayon" },
];

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
function Navigation({ actif }: { actif: PageAdmin }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[240px] flex-none flex-col border-r border-line p-5 lg:flex">
        <Marque />
        <nav aria-label="Pages du tableau de bord" className="mt-8 flex flex-col gap-1">
          {PAGES.map(({ id, href, libelle, icone }) => (
            <Link
              key={id}
              href={href}
              aria-current={id === actif ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] leading-5 font-semibold ${id === actif ? "bg-tint-2 text-leaf-deep" : "text-ink-2 hover:bg-card"}`}
            >
              <Icon name={icone} size={19} />
              {libelle}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {/* Une adresse à télécharger, pas une page : le lien de Next ne convient pas. */}
          <a href="/admin/export" download className="press flex min-h-11 items-center justify-center rounded-full bg-brand px-4 text-[14px] leading-5 font-bold text-on-brand">
            Exporter en CSV
          </a>
          <form action={deconnexion}>
            <button type="submit" className="press min-h-11 w-full rounded-full px-4 text-[14px] leading-5 font-semibold text-ink-2">
              Se déconnecter
            </button>
          </form>
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
        <nav aria-label="Pages du tableau de bord" className="flex gap-1.5 overflow-x-auto px-4 py-2">
          {PAGES.map(({ id, href, libelle }) => (
            <Link
              key={id}
              href={href}
              aria-current={id === actif ? "page" : undefined}
              className={`flex min-h-11 flex-none items-center rounded-full px-3.5 text-[14px] leading-5 font-semibold whitespace-nowrap ${id === actif ? "bg-brand text-on-brand" : "bg-card"}`}
            >
              {libelle}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

async function Protege({ actif, titre, sousTitre, children }: CadreProps) {
  if (!(await estConnecte())) {
    return (
      <main id="contenu" className="w-full flex-1 px-4">
        <Connexion />
      </main>
    );
  }
  return (
    <div className="flex min-h-dvh w-full flex-col lg:flex-row">
      <Navigation actif={actif} />
      <main id="contenu" className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 px-4 pt-4 pb-10 lg:px-8 lg:pt-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 lg:mb-6">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-8 font-bold tracking-[-0.01em] lg:text-[30px] lg:leading-9">{titre}</h1>
            {sousTitre && <p className="mt-0.5 text-[14px] leading-5 text-ink-2">{sousTitre}</p>}
          </div>
          <a href="/admin/export" download className="press flex min-h-11 items-center rounded-full bg-tint px-4 text-[14px] leading-5 font-semibold lg:hidden">
            Exporter en CSV
          </a>
        </div>
        {children}
      </main>
    </div>
  );
}

type CadreProps = { actif: PageAdmin; titre: string; sousTitre?: string; children: ReactNode };

export function Cadre(props: CadreProps) {
  return (
    <Suspense fallback={<p role="status" className="mt-16 w-full text-center text-[15px] text-ink-2">Chargement…</p>}>
      <Protege {...props} />
    </Suspense>
  );
}

export function Carte({ titre, sousTitre, className = "", children }: { titre: string; sousTitre?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-2xl bg-card p-4 lg:p-5 ${className}`}>
      <h2 className="text-[16px] leading-[22px] font-bold">{titre}</h2>
      {sousTitre && <p className="mt-0.5 text-[13px] leading-[18px] text-ink-2">{sousTitre}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Indisponible() {
  return <p role="status" className="text-[15px] leading-[22px] text-ink-2">Les chiffres sont indisponibles : la base de données ne répond pas.</p>;
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="py-4 text-[15px] leading-[22px] text-ink-2">{children}</p>;
}
