import type { ComponentProps } from "react";

type Fond = "blanc" | "teinte";

const FONDS: Record<Fond, string> = {
  blanc: "bg-card p-5",
  teinte: "bg-tint p-5",
};

type CarteProps = ComponentProps<"section"> & { fond?: Fond };

/** Un grand bloc aux coins arrondis : blanc avec une ombre douce, ou teinté de vert. */
export function Carte({ fond = "blanc", className = "", ...props }: CarteProps) {
  return <section {...props} className={`rounded-[28px] ${FONDS[fond]} ${className}`} />;
}
