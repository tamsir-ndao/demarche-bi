"use client";

import { useEffect, useState } from "react";
import { stockageLocal } from "@/lib/bienvenue";
import { effacerHistorique } from "@/lib/conversation/historique";
import { choisirVoixAutomatique, voixAutomatique } from "@/lib/preferences";
import { Icon, type IconName } from "./Icon";

function Pastille({ icone }: { icone: IconName }) {
  return (
    <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-xl bg-tint text-leaf">
      <Icon name={icone} size={19} />
    </span>
  );
}

/** L'interrupteur « Lire les réponses à voix haute ». */
export function ReglageVoix() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const trame = requestAnimationFrame(() => setActive(voixAutomatique(stockageLocal())));
    return () => cancelAnimationFrame(trame);
  }, []);

  function basculer() {
    choisirVoixAutomatique(stockageLocal(), !active);
    setActive(!active);
  }

  return (
    <button type="button" role="switch" aria-checked={active} onClick={basculer} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left">
      <Pastille icone="haut-parleur" />
      <span className="min-w-0 flex-1 text-[16px] leading-[22px] font-semibold">Lire les réponses à voix haute</span>
      <span aria-hidden="true" className={`flex h-[30px] w-[50px] flex-none items-center rounded-full p-[3px] transition-colors ${active ? "justify-end bg-brand" : "justify-start bg-tint-2"}`}>
        <span className={`block size-6 rounded-full ${active ? "bg-on-brand" : "bg-ink-2"}`} />
      </span>
    </button>
  );
}

/** « Effacer mon historique », avec une confirmation sur place. */
export function ReglageEffacer() {
  const [etat, setEtat] = useState<"repos" | "confirmer" | "fait">("repos");

  if (etat === "confirmer") {
    return (
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-[15px] leading-[22px]">Effacer toutes tes conversations de ce téléphone ?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              effacerHistorique(stockageLocal());
              setEtat("fait");
            }}
            className="press min-h-11 flex-1 rounded-full bg-brand text-[15px] leading-5 font-bold text-on-brand"
          >
            Tout effacer
          </button>
          <button type="button" onClick={() => setEtat("repos")} className="press min-h-11 flex-1 rounded-full bg-tint text-[15px] leading-5 font-semibold">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setEtat("confirmer")} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left">
      <Pastille icone="poubelle" />
      <span className="min-w-0 flex-1 text-[16px] leading-[22px] font-semibold">Effacer mon historique</span>
      <span role="status" className="flex-none text-[14px] leading-5 text-ink-2">
        {etat === "fait" ? "Effacé" : <Icon name="chevron-droite" size={18} />}
      </span>
    </button>
  );
}
