import Link from "next/link";
import type { ReactNode } from "react";
import { REPO_URL, URL_SIGNALER } from "@/lib/liens";
import { Icon, type IconName } from "./Icon";

export type Onglet = "question" | "demarches" | "a-propos";

const ONGLETS: { id: Onglet; href: string; libelle: string; icone: IconName }[] = [
  { id: "question", href: "/", libelle: "Question", icone: "bulle" },
  { id: "demarches", href: "/demarches", libelle: "Démarches", icone: "livre" },
  { id: "a-propos", href: "/a-propos", libelle: "À propos", icone: "info" },
];

function Logo({ masqueSurMobile }: { masqueSurMobile: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Démarche-Bi, accueil"
      className={`min-h-11 items-center gap-2.5 lg:flex lg:gap-3 ${masqueSurMobile ? "hidden" : "flex"}`}
    >
      <span className="flex size-[34px] items-center justify-center rounded-[11px] bg-brand text-on-brand lg:size-10 lg:rounded-[13px]">
        <Icon name="coche" size={20} strokeWidth={3} className="lg:size-6" />
      </span>
      <span className="text-[19px] leading-6 font-bold tracking-[-0.01em] lg:text-[22px] lg:leading-7">
        Démarche<span className="text-leaf">-Bi</span>
      </span>
    </Link>
  );
}

function MenuBureau({ actif }: { actif?: Onglet }) {
  return (
    <nav aria-label="Navigation principale" className="hidden gap-1.5 lg:flex">
      {ONGLETS.map((onglet) => (
        <Link
          key={onglet.id}
          href={onglet.href}
          aria-current={onglet.id === actif ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-full px-5 text-base leading-[22px] transition-colors hover:bg-tint ${
            onglet.id === actif ? "bg-tint-2 font-bold text-leaf-deep hover:bg-tint-2" : "font-semibold text-ink-2"
          }`}
        >
          {onglet.libelle}
        </Link>
      ))}
    </nav>
  );
}

function BarreDuBas({ actif }: { actif?: Onglet }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky bottom-0 z-10 flex bg-card px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-nav lg:hidden"
    >
      {ONGLETS.map((onglet) => {
        const courant = onglet.id === actif;
        return (
          <Link
            key={onglet.id}
            href={onglet.href}
            aria-current={courant ? "page" : undefined}
            className={`flex min-h-12 flex-1 flex-col items-center gap-1 ${courant ? "" : "text-ink-2"}`}
          >
            <span
              className={`flex h-8 w-14 items-center justify-center rounded-full ${courant ? "bg-tint-2 text-leaf-deep" : ""}`}
            >
              <Icon name={onglet.icone} size={22} strokeWidth={courant ? 2.2 : 2} />
            </span>
            <span className={`text-xs leading-4 ${courant ? "font-bold" : "font-semibold"}`}>{onglet.libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const LIEN_PIED = "flex min-h-11 items-center rounded-full px-3.5 text-sm leading-5 font-bold text-leaf-deep transition-colors hover:bg-tint";

type PageShellProps = {
  /** L'onglet à mettre en avant dans le menu. */
  actif?: Onglet;
  /** Sur téléphone : un bouton retour à la place du logo. */
  retour?: { href: string; libelle: string };
  /** Pleine largeur (page d'accueil) au lieu de la colonne centrée. */
  large?: boolean;
  children: ReactNode;
};

/** Le cadre commun des pages : en-tête, menu (en haut sur ordinateur, en bas sur téléphone) et avertissement. */
export function PageShell({ actif, retour, large = false, children }: PageShellProps) {
  return (
    <>
      <header className="flex items-center justify-between px-5 py-1.5 lg:px-16 lg:py-5">
        {retour ? (
          <Link
            href={retour.href}
            aria-label={retour.libelle}
            className="press flex size-11 items-center justify-center rounded-full bg-card shadow-soft lg:hidden"
          >
            <Icon name="fleche-gauche" />
          </Link>
        ) : null}
        <Logo masqueSurMobile={Boolean(retour)} />
        <MenuBureau actif={actif} />
      </header>

      <main
        id="contenu"
        className={`mx-auto flex w-full flex-1 flex-col ${large ? "max-w-[1200px] px-5 lg:px-16" : "max-w-[720px] px-4 lg:px-6"}`}
      >
        {children}
      </main>

      <footer className="px-4 pt-2 pb-3 text-center lg:flex lg:items-center lg:justify-between lg:gap-6 lg:border-t lg:border-line lg:px-16 lg:pt-5 lg:pb-7 lg:text-left">
        <p className="text-[13px] leading-[18px] text-ink-3 lg:text-sm lg:leading-5">
          Information indicative, à vérifier avant de te déplacer.
        </p>
        <nav aria-label="Liens utiles" className="hidden items-center gap-2 lg:flex">
          <Link href="/a-propos" className={LIEN_PIED}>
            À propos
          </Link>
          <a href={REPO_URL} className={LIEN_PIED}>
            Voir le code sur GitHub
          </a>
          <a href={URL_SIGNALER} className={LIEN_PIED}>
            Signaler une erreur
          </a>
        </nav>
      </footer>

      <BarreDuBas actif={actif} />
    </>
  );
}
