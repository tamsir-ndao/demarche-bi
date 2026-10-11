import Link from "next/link";
import { Icon, type IconName } from "./Icon";

type CarteDemarcheProps = {
  href: string;
  titre: string;
  /** La ligne sous le titre : le coût et le délai de la fiche. */
  detail: string;
  icone: IconName;
};

/** Une démarche dans une liste : une icône, son titre, son coût et son délai. */
export function CarteDemarche({ href, titre, detail, icone }: CarteDemarcheProps) {
  return (
    <Link
      href={href}
      className="press flex min-h-[88px] items-center gap-3.5 rounded-3xl bg-card py-3.5 pr-4 pl-3.5 shadow-soft transition-colors hover:bg-tint"
    >
      <span aria-hidden="true" className="flex size-12 flex-none items-center justify-center rounded-full bg-tint text-leaf">
        <Icon name={icone} size={24} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-6 font-bold">{titre}</span>
        <span className="mt-0.5 block text-sm leading-5 text-ink-2">{detail}</span>
      </span>
      <Icon name="chevron-droite" className="flex-none text-ink-2" />
    </Link>
  );
}
