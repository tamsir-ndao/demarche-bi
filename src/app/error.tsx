"use client"; // Une frontière d'erreur est forcément un composant client.

import { useEffect } from "react";
import { Carte } from "@/components/Carte";
import { Icon } from "@/components/Icon";
import { classesBouton, LienBouton } from "@/components/LienBouton";
import { PageShell } from "@/components/PageShell";

/**
 * Quand une page casse en cours de route : le même cadre que le reste du site (en-tête, menu), un mot simple et
 * trois issues. Aucun détail technique à l'écran : le message d'une erreur pourrait citer la question posée.
 */
export default function Erreur({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Seulement l'empreinte (ou le nom) : de quoi retrouver l'erreur dans les journaux du serveur, sans son message.
    console.error(error.digest ?? error.name);
  }, [error]);

  return (
    <PageShell retour={{ href: "/", libelle: "Retour à l’accueil" }}>
      <Carte aria-labelledby="titre-erreur" className="mt-4 px-5 py-6">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-leaf"
        >
          <Icon name="info" size={30} strokeWidth={2} />
        </span>
        <h1 id="titre-erreur" className="mt-4 text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
          Quelque chose a cassé.
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">Ce n’est pas toi. Réessaie, ou reviens à l’accueil.</p>
      </Carte>

      <button type="button" onClick={() => retry()} className={classesBouton("principal", "grand", "mt-5")}>
        Réessayer
      </button>
      <LienBouton href="/" variante="secondaire" icone="bulle" className="mt-3">
        Accueil
      </LienBouton>
      <LienBouton href="/demarches" variante="secondaire" icone="livre" className="mt-3">
        Voir les démarches
      </LienBouton>
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}
