"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { GROUPES_APPARITION, groupesJusquA, montrer, planCascade, type GroupeApparition } from "@/lib/voix/apparition";
import { parleurDuNavigateur } from "@/lib/voix/parleur";

/** Sans voix : un groupe toutes les 90 ms. */
const PAS_CASCADE_MS = 90;
/** Ce qui reste quand la voix s'arrête ou que la personne bouge : vite, sans tout afficher d'un coup. */
const PAS_RAPIDE_MS = 40;
/** Quoi qu'il arrive, tout est à l'écran après ce délai. */
const REPLI_MS = 20_000;
/** Le premier geste de la personne : quelqu'un qui fait défiler veut lire, on ne le fait pas attendre la voix. */
const GESTES = ["pointerdown", "wheel", "touchstart", "keydown"] as const;

/**
 * Fait apparaître la réponse bloc par bloc. Les blocs portent `data-apparition="groupe"` (voir lib/voix/apparition) et
 * le CSS les cache tant qu'ils n'ont pas `data-visible` (globals.css). Si la voix lit la réponse, chaque groupe se
 * montre quand elle y arrive ; sinon, les groupes se suivent en cascade. Le composant ne pose que cet attribut : le
 * surlignage et le défilement restent au bouton Écouter. Sans JavaScript ou animations coupées, tout est visible.
 */
export function Apparition({ children }: { children: ReactNode }) {
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = racine.current;
    if (!element) return;
    const montres = new Set<GroupeApparition>();
    const minuteries = new Set<ReturnType<typeof setTimeout>>();

    const afficher = (groupe: GroupeApparition) => {
      if (montres.has(groupe)) return;
      montres.add(groupe);
      montrer(element, groupe);
    };
    const cascade = (pasMs: number) => {
      for (const { groupe, delaiMs } of planCascade(montres, pasMs)) {
        const minuterie = setTimeout(() => {
          minuteries.delete(minuterie);
          afficher(groupe);
        }, delaiMs);
        minuteries.add(minuterie);
      }
    };
    const arreterLesMinuteries = () => {
      for (const minuterie of minuteries) clearTimeout(minuterie);
      minuteries.clear();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const groupe of GROUPES_APPARITION) afficher(groupe);
      return;
    }

    const parleur = parleurDuNavigateur();
    // La lecture automatique démarre dans l'effet du bouton Écouter, un enfant : il a tourné avant celui-ci.
    if (parleur.etat() !== "lecture") {
      cascade(PAS_CASCADE_MS);
      return arreterLesMinuteries;
    }

    // Mode voix : l'écran suit la phrase en cours.
    let termine = false;
    const retirerLesGestes = () => {
      for (const geste of GESTES) window.removeEventListener(geste, montrerLeReste);
    };
    const montrerLeReste = () => {
      if (termine) return;
      termine = true;
      desabonner();
      retirerLesGestes();
      cascade(PAS_RAPIDE_MS);
    };
    const suivreLaVoix = () => {
      if (parleur.etat() !== "lecture") {
        // Fin de la lecture, « Arrêter », ou refus du téléphone : le reste arrive sans attendre.
        montrerLeReste();
        return;
      }
      for (const groupe of groupesJusquA(parleur.cible())) afficher(groupe);
    };
    const desabonner = parleur.abonner(suivreLaVoix);
    for (const geste of GESTES) window.addEventListener(geste, montrerLeReste, { passive: true });
    const repli = setTimeout(montrerLeReste, REPLI_MS);
    minuteries.add(repli);
    suivreLaVoix();

    return () => {
      termine = true;
      desabonner();
      retirerLesGestes();
      arreterLesMinuteries();
    };
  }, []);

  return (
    <div ref={racine} data-apparition-racine="">
      {children}
    </div>
  );
}
