"use client";

import { useEffect, useSyncExternalStore } from "react";
import { fautRafraichir } from "@/lib/hors-connexion/rafraichir";

// Le site marche sans connexion : ce composant enregistre le service worker (public/sw.js), qui garde les pages sur
// le téléphone, et prévient la personne quand elle n'a plus de réseau. Il est monté une fois, dans layout.tsx.

const CLE_COPIES = "demarche-bi:copies-hors-connexion";

function stockage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined; // interdit (navigation privée, réglages du navigateur) : on met alors à jour à chaque ouverture
  }
}

function derniereMiseAJour(): number | null {
  const valeur = Number(stockage()?.getItem(CLE_COPIES));
  return valeur > 0 ? valeur : null;
}

function noterLaMiseAJour() {
  try {
    stockage()?.setItem(CLE_COPIES, String(Date.now()));
  } catch {
    // tant pis : la prochaine ouverture refera la mise à jour
  }
}

/** Enregistre le service worker, et lui demande de rafraîchir ses copies au plus une fois par demi-journée. */
async function preparerLesCopies() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  const premiereVisite = !navigator.serviceWorker.controller;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    const pret = await navigator.serviceWorker.ready;
    // Première visite : il fait déjà ses copies en s'installant. Ensuite : seulement si elles sont vieilles et s'il y a du réseau.
    if (premiereVisite) noterLaMiseAJour();
    else if (navigator.onLine && fautRafraichir(derniereMiseAJour(), Date.now())) {
      pret.active?.postMessage("rafraichir");
      noterLaMiseAJour();
    }
  } catch {
    // Sans service worker, le site marche comme avant (avec du réseau) : rien à montrer.
  }
}

function sAbonner(prevenir: () => void) {
  window.addEventListener("online", prevenir);
  window.addEventListener("offline", prevenir);
  return () => {
    window.removeEventListener("online", prevenir);
    window.removeEventListener("offline", prevenir);
  };
}

export function HorsConnexion() {
  // Sur le serveur et à l'hydratation : « connecté », pour ne rien changer au premier affichage.
  const connecte = useSyncExternalStore(sAbonner, () => navigator.onLine, () => true);

  useEffect(() => {
    void preparerLesCopies();
  }, []);

  // La zone existe toujours (vide quand tout va bien) : c'est ce qui fait lire le message par les lecteurs d'écran.
  return (
    <div role="status" className="sticky top-0 z-20">
      {connecte ? null : (
        <p className="bg-tint-2 px-4 py-2 text-center text-sm leading-5 font-semibold text-ink">
          Tu es hors connexion. Les fiches restent lisibles.
        </p>
      )}
    </div>
  );
}
