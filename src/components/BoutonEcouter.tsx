"use client";

import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";
import { consommerLaDemande, stockageDeLOnglet } from "@/lib/voix/lectureAuto";
import { parleurDuNavigateur } from "@/lib/voix/parleur";
import { Icon } from "./Icon";
import { classesBouton } from "./LienBouton";

/**
 * Lire la réponse à voix haute, avec la voix du téléphone (rien n'est envoyé ailleurs). Le texte à lire est préparé
 * par le serveur (lib/voix/lecture) à partir de la même fiche que l'écran. Après une question posée à voix haute,
 * la lecture démarre toute seule ; sinon, elle ne démarre que sur l'appui. Le bouton disparaît si le téléphone
 * n'a aucune voix française.
 */
export function BoutonEcouter({ morceaux, className = "" }: { morceaux: string[]; className?: string }) {
  const parleur = parleurDuNavigateur();
  // Sur le serveur, on montre le bouton : s'il n'y a pas de voix, il disparaît à l'arrivée de la page dans le navigateur.
  const etat = useSyncExternalStore(parleur.abonner, parleur.etat, () => "repos" as const);

  const lireLaReponse = useEffectEvent(() => parleur.lire(morceaux));
  const demarre = useRef(false);
  const monte = useRef(false);

  useEffect(() => {
    monte.current = true;
    if (!demarre.current) {
      demarre.current = true;
      if (consommerLaDemande(stockageDeLOnglet(), Date.now())) lireLaReponse();
    }
    return () => {
      monte.current = false;
      // Quitter la page coupe la voix. Le mode développement démonte puis remonte aussitôt : ce cas-là ne la coupe pas.
      setTimeout(() => {
        if (!monte.current) parleur.arreter();
      }, 0);
    };
  }, [parleur]);

  if (etat === "indisponible") return null;
  const enLecture = etat === "lecture";

  return (
    <button
      type="button"
      onClick={() => (enLecture ? parleur.arreter() : parleur.lire(morceaux))}
      className={classesBouton("secondaire", "petit", `w-fit ${className}`)}
    >
      <Icon name={enLecture ? "arreter" : "haut-parleur"} size={20} />
      {enLecture ? "Arrêter" : "Écouter la réponse"}
    </button>
  );
}
