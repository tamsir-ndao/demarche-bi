import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variante = "principal" | "secondaire" | "lien";
type Taille = "grand" | "moyen" | "petit";

const VARIANTES: Record<Variante, string> = {
  principal: "bg-brand font-bold text-on-brand",
  secondaire: "border-[1.5px] border-edge bg-card font-bold",
  lien: "min-h-11 text-[15px] leading-5 font-bold text-leaf-deep underline underline-offset-4",
};

const TAILLES: Record<Taille, string> = {
  grand: "min-h-14 px-6 text-[17px] leading-[22px]",
  moyen: "min-h-[52px] px-6 text-base leading-[22px]",
  petit: "min-h-11 px-[18px] text-[15px] leading-5",
};

type LienBoutonProps = {
  href: string;
  variante?: Variante;
  taille?: Taille;
  icone?: IconName;
  /** Lien vers un autre site : il s'ouvre dans un nouvel onglet. */
  externe?: boolean;
  className?: string;
  children: ReactNode;
};

/** Un lien qui a l'allure d'un bouton : vert plein, contour, ou simple texte souligné. */
export function LienBouton({
  href,
  variante = "principal",
  taille = "grand",
  icone,
  externe = false,
  className = "",
  children,
}: LienBoutonProps) {
  const classes = `press flex items-center justify-center gap-2.5 rounded-full text-center ${VARIANTES[variante]} ${
    variante === "lien" ? "" : TAILLES[taille]
  } ${className}`;
  const contenu = (
    <>
      {icone ? <Icon name={icone} size={taille === "grand" ? 22 : 20} /> : null}
      {children}
      {externe ? <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span> : null}
    </>
  );

  return externe ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {contenu}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {contenu}
    </Link>
  );
}
