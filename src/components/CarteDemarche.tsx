import Link from "next/link";
import { Icon, type IconName } from "./Icon";

type CarteDemarcheProps = {
  href: string;
  titre: string;
  /** La ligne sous le titre : le coût et le délai de la fiche. */
  detail: string;
  icone: IconName;
  /** « autre » : le choix « Autre chose » d'une liste, avec une icône en pointillés. */
  variante?: "demarche" | "autre";
};

const ICONES: Record<NonNullable<CarteDemarcheProps["variante"]>, string> = {
  demarche: "bg-tint",
  autre: "border-[1.5px] border-dashed border-edge",
};

/** Une démarche dans une liste : une icône, son titre, son coût et son délai. */
export function CarteDemarche({ href, titre, detail, icone, variante = "demarche" }: CarteDemarcheProps) {
  return (
    <Link
      href={href}
      className="press flex h-full min-h-[88px] items-center gap-3.5 rounded-3xl bg-card py-3.5 pr-4 pl-3.5 transition-colors hover:bg-tint"
    >
      <span
        aria-hidden="true"
        className={`flex size-12 flex-none items-center justify-center rounded-full text-leaf ${ICONES[variante]}`}
      >
        <Icon name={icone} size={24} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-6 font-bold">{titre}</span>
        {/* Sur ordinateur, deux lignes au plus : le détail complet est sur la fiche. */}
        <span className="mt-0.5 block text-sm leading-5 text-ink-2 lg:line-clamp-2">{detail}</span>
      </span>
      <Icon name="chevron-droite" className="flex-none text-ink-2" />
    </Link>
  );
}
