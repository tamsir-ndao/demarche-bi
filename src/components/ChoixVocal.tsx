"use client";

import type { ReactNode } from "react";
import { oublierLaDemande, stockageDeLOnglet } from "@/lib/voix/lectureAuto";
import { parleurDuNavigateur } from "@/lib/voix/parleur";

/**
 * Enveloppe un lien de l'écran de précision pour que la conversation vocale continue (ou s'arrête) après le toucher.
 * « continuer » : pendant l'appui, une phrase muette débloque la voix (l'iPhone ne l'autorise qu'à ce moment-là) et
 * la note de lecture reste pour la page choisie. « arreter » (accueil, annulation) : la note est effacée.
 * Le lien garde sa navigation, son clavier et son accessibilité : rien n'est ajouté autour, l'enveloppe est invisible.
 */
export function ChoixVocal({ children, action }: { children: ReactNode; action: "continuer" | "arreter" }) {
  return (
    <span
      className="contents"
      onClickCapture={() => {
        if (action === "continuer") parleurDuNavigateur().debloquer();
        else oublierLaDemande(stockageDeLOnglet());
      }}
    >
      {children}
    </span>
  );
}
