import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Fond = "carte" | "teinte";

/** Sur la page : une carte blanche ; dans une carte : un bloc teinté, pour qu'on le distingue. */
const FONDS: Record<Fond, string> = {
  carte: "rounded-3xl bg-card",
  teinte: "rounded-[20px] bg-tint",
};

type SectionRepliableProps = {
  icone: IconName;
  titre: string;
  /** La ligne sous le titre : ce qu'on trouve en ouvrant (« 4 étapes, dans l'ordre »). */
  detail: string;
  /** Repère vocal posé sur le résumé, pour que le surlignage et le défilement de la voix le trouvent. */
  repere?: string;
  /** Ouverte au chargement. Par défaut fermée. */
  ouverte?: boolean;
  fond?: Fond;
  className?: string;
  children: ReactNode;
};

/** Une section repliée, même dessin que les sources : une ligne qui résume, et qui s'ouvre pour montrer le reste. */
export function SectionRepliable({
  icone,
  titre,
  detail,
  repere,
  ouverte = false,
  fond = "carte",
  className = "",
  children,
}: SectionRepliableProps) {
  return (
    <details open={ouverte || undefined} className={`group ${FONDS[fond]} ${className}`}>
      <summary
        data-lecture={repere}
        className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-3xl py-3 pr-[18px] pl-3.5 [&::-webkit-details-marker]:hidden"
      >
        <span className={`flex size-10 flex-none items-center justify-center rounded-full text-leaf ${fond === "carte" ? "bg-tint" : "bg-card"}`}>
          <Icon name={icone} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-5 font-bold">{titre}</span>
          <span className="block text-[13px] leading-[18px] text-ink-2">{detail}</span>
        </span>
        <Icon name="chevron-bas" className="flex-none transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-3.5">{children}</div>
    </details>
  );
}
