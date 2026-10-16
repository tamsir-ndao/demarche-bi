"use client";

import { useEffect, useRef, useState } from "react";
import type { Fiche } from "@/lib/fiches/schema";
import { lienWhatsApp, texteDePartage } from "@/lib/partage";
import { Icon } from "./Icon";
import { classesBouton } from "./LienBouton";

const DUREE_MESSAGE_MS = 2000;

type BoutonPartagerProps = {
  fiche: Pick<Fiche, "slug" | "titre" | "resume">;
  className?: string;
};

/**
 * Partager une fiche (WhatsApp et le reste). Sur un téléphone, la feuille de partage du système s'ouvre ; sinon, on
 * ouvre WhatsApp dans un nouvel onglet et on copie le lien, avec un mot pour le dire. Rien n'est envoyé au site :
 * pas de script tiers, pas de suivi. L'adresse est lue au clic, jamais au rendu : la page est prérendue.
 */
export function BoutonPartager({ fiche, className = "" }: BoutonPartagerProps) {
  const [copie, setCopie] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, []);

  async function partager() {
    const { title, text, url } = texteDePartage(fiche, window.location.origin);
    const donnees = { title, text, url };

    if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(donnees))) {
      try {
        await navigator.share(donnees);
        return;
      } catch (erreur) {
        // L'utilisateur a refermé la feuille de partage : rien à dire.
        if (erreur instanceof DOMException && erreur.name === "AbortError") return;
        // Sinon (partage refusé par le navigateur), on retombe sur WhatsApp.
      }
    }

    // Ouvert tout de suite, dans le même geste que le clic : plus tard, le navigateur le bloquerait.
    window.open(lienWhatsApp(`${title}\n${text}`, url), "_blank", "noopener,noreferrer");

    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      if (minuterie.current) clearTimeout(minuterie.current);
      minuterie.current = setTimeout(() => setCopie(false), DUREE_MESSAGE_MS);
    } catch {
      // Pas de presse-papiers (page non sécurisée, permission refusée) : WhatsApp est déjà ouvert, ça suffit.
    }
  }

  return (
    <>
      <button type="button" onClick={partager} className={classesBouton("secondaire", "grand", className)}>
        <Icon name="partager" size={22} />
        Partager
      </button>
      <p aria-live="polite" className={`text-center text-sm leading-5 text-ink-2 ${copie ? "mt-2" : "sr-only"}`}>
        {copie ? "Lien copié" : ""}
      </p>
    </>
  );
}
