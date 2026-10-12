"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  choisirMessage,
  DELAI_AVANT_MESSAGE_MS,
  ecrireRejet,
  estSafariIos,
  lireRejet,
  rejeteRecemment,
  type Stockage,
} from "@/lib/installation";
import { Icon } from "./Icon";
import { classesBouton } from "./LienBouton";

// Proposer d'installer Démarche-Bi sur l'écran d'accueil du téléphone : un petit message au-dessus du menu du bas,
// quelques secondes après l'arrivée. Sur Android, un bouton « Installer » ouvre la fenêtre du navigateur ; sur
// l'iPhone il n'existe aucun bouton de ce genre, on explique donc quoi toucher dans Safari.
// Les règles (quand l'afficher, pendant combien de temps il se tait) sont dans lib/installation.

/** L'invitation que Chrome prépare pour l'installation (pas encore dans les types du navigateur). */
type Invitation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Chrome n'envoie son invitation qu'une fois par visite, parfois avant que la page ait fini de s'afficher :
// on l'attrape dès que ce fichier est chargé et on la garde ici pour le message.
let invitation: Invitation | undefined;
const abonnes = new Set<() => void>();

function garder(nouvelle: Invitation | undefined) {
  invitation = nouvelle;
  abonnes.forEach((prevenir) => prevenir());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evenement) => {
    evenement.preventDefault(); // pas de bannière du navigateur : le message ci-dessous la remplace
    garder(evenement as Invitation);
  });
  window.addEventListener("appinstalled", () => garder(undefined));
}

function sAbonner(prevenir: () => void) {
  abonnes.add(prevenir);
  return () => {
    abonnes.delete(prevenir);
  };
}

/** Ce que le navigateur dit de lui, lu une fois le délai passé (jamais pendant l'affichage sur le serveur). */
type Lieu = { installee: boolean; rejete: boolean; safariIos: boolean };

function stockageLocal(): Stockage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined; // le stockage peut être interdit (navigation privée, réglages du navigateur)
  }
}

function lireLieu(): Lieu {
  const { standalone } = navigator as Navigator & { standalone?: boolean };
  return {
    // Ouverte depuis l'icône : en plein écran (Android) ou « standalone » (iPhone).
    installee: window.matchMedia("(display-mode: standalone)").matches || standalone === true,
    rejete: rejeteRecemment(lireRejet(stockageLocal()), Date.now()),
    safariIos: estSafariIos({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    }),
  };
}

export function MessageInstaller() {
  const invitationChrome = useSyncExternalStore(
    sAbonner,
    () => invitation,
    () => undefined,
  );
  const [lieu, setLieu] = useState<Lieu>();
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    const minuterie = setTimeout(() => setLieu(lireLieu()), DELAI_AVANT_MESSAGE_MS);
    return () => clearTimeout(minuterie);
  }, []);

  const message =
    lieu && !ferme
      ? choisirMessage({
          installee: lieu.installee,
          rejeteRecemment: lieu.rejete,
          delaiEcoule: true,
          invitationPrete: invitationChrome !== undefined,
          safariIos: lieu.safariIos,
        })
      : "aucun";
  if (message === "aucun") return null;

  function plusTard() {
    ecrireRejet(stockageLocal(), Date.now());
    setFerme(true);
  }

  async function installer() {
    const proposition = invitation;
    if (!proposition) return;
    garder(undefined); // l'invitation ne sert qu'une fois : le message s'efface pendant la fenêtre du navigateur
    try {
      await proposition.prompt();
      const { outcome } = await proposition.userChoice;
      if (outcome === "dismissed") ecrireRejet(stockageLocal(), Date.now());
    } catch {
      // Le navigateur n'a pas pu ouvrir sa fenêtre : le menu du navigateur propose aussi « Installer l'application ».
    }
  }

  return (
    <section
      aria-labelledby="titre-installation"
      // Sur téléphone seulement, 8 px au-dessus du menu du bas : le menu (PageShell) mesure 60 px plus sa marge du bas
      // (au moins 12 px, ou la zone du geste de l'iPhone), d'où 4,25 rem (68 px) plus cette marge.
      className="fixed inset-x-3 bottom-[calc(4.25rem+max(0.75rem,env(safe-area-inset-bottom)))] z-20 mx-auto max-w-[480px] rounded-3xl border border-line bg-card p-4 shadow-soft transition-[opacity,translate] duration-300 starting:translate-y-4 starting:opacity-0 lg:hidden"
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-brand text-on-brand"
        >
          <Icon name="coche" size={22} strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p id="titre-installation" className="text-[17px] leading-6 font-bold text-balance">
            {message === "android" ? "Installe Démarche-Bi" : "Ajoute Démarche-Bi à ton écran"}
          </p>
          <p className="mt-0.5 text-[15px] leading-5 text-ink-2">
            {message === "android" ? (
              "Un appui, et tu la retrouves sur ton écran d’accueil."
            ) : (
              <>
                Touche Partager <Icon name="partager" size={18} className="inline-block align-[-4px] text-leaf" />, puis{" "}
                <span className="whitespace-nowrap">«&nbsp;Sur l’écran d’accueil&nbsp;».</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex gap-2.5">
        {message === "android" ? (
          <>
            <button type="button" onClick={installer} className={classesBouton("principal", "petit", "flex-1")}>
              Installer
            </button>
            <button type="button" onClick={plusTard} className={classesBouton("secondaire", "petit", "flex-1")}>
              Plus tard
            </button>
          </>
        ) : (
          <button type="button" onClick={plusTard} className={classesBouton("principal", "petit", "flex-1")}>
            Compris
          </button>
        )}
      </div>
    </section>
  );
}
