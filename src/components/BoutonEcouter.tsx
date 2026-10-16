"use client";

import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";
import type { LigneVocale } from "@/lib/voix/lecture";
import { consommerLaDemande, prolongerLaDemande, stockageDeLOnglet } from "@/lib/voix/lectureAuto";
import { parleurDuNavigateur } from "@/lib/voix/parleur";
import { surligner } from "@/lib/voix/surlignage";
import { Icon } from "./Icon";
import { classesBouton } from "./LienBouton";

/** Combien de boutons sont à l'écran : quand le dernier s'en va, la voix se coupe. */
let montes = 0;

/**
 * Lire l'essentiel de la réponse à voix haute, avec la voix du téléphone (rien n'est envoyé ailleurs). Le texte à lire
 * est préparé par le serveur (lib/voix/lecture) à partir de la même fiche que l'écran, et chaque phrase est liée à un
 * bloc de la page : pendant qu'elle est dite, ce bloc est surligné (voir lib/voix/surlignage et globals.css). Après une
 * question posée à voix haute, la lecture démarre toute seule ; sinon, elle ne démarre que sur l'appui. Le bouton
 * disparaît si le téléphone n'a aucune voix française.
 */
export function BoutonEcouter({
  lignes,
  className = "",
  enchainer = false,
}: {
  lignes: LigneVocale[];
  className?: string;
  /** Écran intermédiaire (précision) : après la lecture automatique, la page suivante se lira aussi toute seule. */
  enchainer?: boolean;
}) {
  const parleur = parleurDuNavigateur();
  // Sur le serveur, on montre le bouton : s'il n'y a pas de voix, il disparaît à l'arrivée de la page dans le navigateur.
  const etat = useSyncExternalStore(parleur.abonner, parleur.etat, () => "repos" as const);
  const cible = useSyncExternalStore(parleur.abonner, parleur.cible, () => null);

  const lireLaReponse = useEffectEvent(() => {
    parleur.lire(lignes);
    // La conversation continue : la note est reposée pour la page que la personne va choisir.
    if (enchainer) prolongerLaDemande(stockageDeLOnglet(), Date.now());
  });
  const demarre = useRef(false);

  useEffect(() => {
    montes += 1;
    if (!demarre.current) {
      demarre.current = true;
      if (consommerLaDemande(stockageDeLOnglet(), Date.now())) lireLaReponse();
    }
    return () => {
      montes -= 1;
      // Quitter la page coupe la voix. Le mode développement démonte puis remonte aussitôt, et l'écran de précision
      // peut laisser la place à la fiche dans le même instant : dans ces cas-là, un bouton est encore là, on ne coupe pas.
      setTimeout(() => {
        if (montes === 0) parleur.arreter();
      }, 0);
    };
  }, [parleur]);

  // Le bloc lu est surligné ; quand la phrase suivante arrive (ou que la lecture s'arrête), le surlignage est retiré.
  useEffect(() => {
    if (cible === null) return;
    const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return surligner(document, cible, { mouvementReduit, hauteurFenetre: window.innerHeight });
  }, [cible]);

  if (etat === "indisponible") return null;
  const enLecture = etat === "lecture";

  return (
    <button
      type="button"
      onClick={() => (enLecture ? parleur.arreter() : parleur.lire(lignes))}
      className={classesBouton("secondaire", "petit", `w-fit ${className}`)}
    >
      <Icon name={enLecture ? "arreter" : "haut-parleur"} size={20} />
      {enLecture ? "Arrêter" : "Écouter l’essentiel"}
    </button>
  );
}
