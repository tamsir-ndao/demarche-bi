"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  ATTRIBUT_ATTENTE,
  fautMontrer,
  marquerVue,
  PALIERS,
  PARAMETRE_PRESENTATION,
  presentationDemandee,
  stockageLocal,
  type Palier,
} from "@/lib/bienvenue";
import { ID_ECRAN_DEMARRAGE } from "@/lib/demarrage";
import { Icon } from "./Icon";
import { classesBouton } from "./LienBouton";

// La présentation « Bienvenue » : trois paliers au premier lancement, sur l'accueil, puis plus jamais (note dans
// localStorage), sauf par le lien « Revoir la présentation » qui ouvre `/?presentation`. Même fenêtre plein écran
// que la voix (<dialog>, showModal) ; sur ordinateur, une carte centrée sur un fond assombri. Les règles sont dans
// lib/bienvenue ; ici on attend la fin de l'écran de démarrage, on enchaîne les paliers et on ferme.

/** Un doigt qui glisse d'au moins cette distance change de palier. */
const SEUIL_BALAYAGE_PX = 40;

/** L'écran de démarrage dure 1,7 s : si son `animationend` ne vient pas, on ouvre quand même après ce délai. */
const ATTENTE_DEMARRAGE_MAX_MS = 2_000;

const ID_TITRE = "titre-bienvenue";

/** Un palier : les points de progression (avec ce qu'on met à leur droite), la grande icône, le titre et le texte. */
export function PalierBienvenue({
  palier,
  numero,
  total,
  aDroite,
  classeAnimation = "",
}: {
  palier: Palier;
  numero: number;
  total: number;
  /** Ce qui se place à droite des points (le bouton « Passer »). */
  aDroite?: ReactNode;
  /** La classe d'arrivée du palier (voir .bienvenue-entree dans globals.css). */
  classeAnimation?: string;
}) {
  return (
    <>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div role="group" aria-label={`Palier ${numero} sur ${total}`} className="flex items-center gap-2">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={i + 1 === numero ? "h-2 w-6 rounded-full bg-brand" : "size-2 rounded-full bg-tint-2"}
            />
          ))}
        </div>
        {aDroite}
      </div>
      <div className={`flex flex-1 flex-col items-center justify-center py-8 text-center ${classeAnimation}`}>
        <span aria-hidden="true" className="flex size-24 items-center justify-center rounded-full bg-tint text-leaf">
          <Icon name={palier.icone} size={44} strokeWidth={2} />
        </span>
        <h2
          id={ID_TITRE}
          tabIndex={-1}
          data-titre-voix=""
          className="mt-6 text-[28px] leading-[34px] font-bold tracking-[-0.01em] text-balance focus:outline-none"
        >
          {palier.titre}
        </h2>
        <p className="mt-2.5 max-w-[320px] text-[17px] leading-[26px] text-ink-2">{palier.texte}</p>
      </div>
    </>
  );
}

export function Bienvenue() {
  /** Rien tant qu'on n'a pas décidé côté client : le serveur et le premier rendu donnent la même chose (null). */
  const [decision, setDecision] = useState<"rien" | "montrer">("rien");
  const [index, setIndex] = useState(0);
  const [sens, setSens] = useState<"avant" | "arriere">();
  const dialogue = useRef<HTMLDialogElement>(null);
  /** Arrivé par `?presentation` : on retire le paramètre à la fermeture pour qu'un rechargement ne rouvre rien. */
  const forcee = useRef(false);
  const departX = useRef<number>(undefined);

  // Au montage : faut-il la montrer ? Si non, rien ne change (null). Si oui, une fois la page dessinée, ou après
  // l'écran de démarrage quand il est affiché.
  useEffect(() => {
    // L'accueil, caché avant le premier dessin (SCRIPT_BIENVENUE), réapparaît dès qu'on n'attend plus la fenêtre.
    const montrerAccueil = () => document.documentElement.removeAttribute(ATTRIBUT_ATTENTE);
    const recherche = window.location.search;
    if (!fautMontrer({ stockage: stockageLocal(), recherche })) {
      montrerAccueil();
      return;
    }
    forcee.current = presentationDemandee(recherche);

    let annule = false;
    const ouvrir = () => {
      if (annule) return;
      annule = true;
      setDecision("montrer");
    };

    // L'écran de démarrage n'est animé que sur téléphone (et pas quand les animations sont coupées) : sinon, rien à attendre.
    const demarrage = document.getElementById(ID_ECRAN_DEMARRAGE);
    if (demarrage?.getAttribute("data-actif") !== "oui" || getComputedStyle(demarrage).animationName === "none") {
      const trame = requestAnimationFrame(ouvrir);
      return () => {
        annule = true;
        cancelAnimationFrame(trame);
        montrerAccueil();
      };
    }
    const minuterie = setTimeout(ouvrir, ATTENTE_DEMARRAGE_MAX_MS);
    demarrage.addEventListener("animationend", ouvrir, { once: true });
    return () => {
      annule = true;
      clearTimeout(minuterie);
      demarrage.removeEventListener("animationend", ouvrir);
      montrerAccueil();
    };
  }, []);

  // La fenêtre existe maintenant : on l'ouvre (un très vieux navigateur sans showModal la laisse fermée, donc invisible),
  // puis l'accueil peut réapparaître derrière elle.
  useEffect(() => {
    if (decision !== "montrer") return;
    const fenetre = dialogue.current;
    if (fenetre && typeof fenetre.showModal === "function" && !fenetre.open) fenetre.showModal();
    document.documentElement.removeAttribute(ATTRIBUT_ATTENTE);
  }, [decision]);

  // À chaque palier, le titre prend le focus : le lecteur d'écran annonce où l'on est.
  useEffect(() => {
    if (decision === "montrer") dialogue.current?.querySelector<HTMLElement>("[data-titre-voix]")?.focus();
  }, [decision, index]);

  const total = PALIERS.length;
  const dernier = index === total - 1;

  function aller(nouvelIndex: number) {
    if (nouvelIndex < 0 || nouvelIndex >= total || nouvelIndex === index) return;
    setSens(nouvelIndex > index ? "avant" : "arriere");
    setIndex(nouvelIndex);
  }

  /** Passer, Commencer ou Échap : la fenêtre se ferme, et `terminer` fait le reste. */
  function fermer() {
    if (dialogue.current?.open) dialogue.current.close();
  }

  /** Après la fermeture (quelle qu'en soit la raison) : on note qu'elle a été vue, on nettoie l'adresse. */
  function terminer() {
    marquerVue(stockageLocal());
    if (forcee.current) {
      const adresse = new URL(window.location.href);
      adresse.searchParams.delete(PARAMETRE_PRESENTATION);
      window.history.replaceState(null, "", adresse);
    }
    setDecision("rien");
  }

  function surTouche(evenement: KeyboardEvent<HTMLDialogElement>) {
    if (evenement.key === "ArrowRight") {
      evenement.preventDefault();
      aller(index + 1);
    } else if (evenement.key === "ArrowLeft") {
      evenement.preventDefault();
      aller(index - 1);
    }
    // Échap : le navigateur ferme la fenêtre lui-même (onClose).
  }

  function debutBalayage(evenement: PointerEvent<HTMLDivElement>) {
    departX.current = evenement.clientX;
  }

  function finBalayage(evenement: PointerEvent<HTMLDivElement>) {
    const depart = departX.current;
    departX.current = undefined;
    if (depart === undefined) return;
    const distance = evenement.clientX - depart;
    if (Math.abs(distance) < SEUIL_BALAYAGE_PX) return;
    aller(distance < 0 ? index + 1 : index - 1);
  }

  if (decision !== "montrer") return null;

  const palier = PALIERS[index];
  const classeAnimation = sens === "avant" ? "bienvenue-entree" : sens === "arriere" ? "bienvenue-entree-inverse" : "";

  return (
    <dialog
      ref={dialogue}
      aria-labelledby={ID_TITRE}
      onClose={terminer}
      onKeyDown={surTouche}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-page p-0 text-left text-ink backdrop:bg-transparent lg:m-auto lg:h-fit lg:max-h-[calc(100dvh-2rem)] lg:w-[calc(100vw-2rem)] lg:max-w-[520px] lg:rounded-[28px] lg:bg-card lg:backdrop:bg-black/50"
    >
      <div
        className="flex min-h-dvh flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:p-7"
        onPointerDown={debutBalayage}
        onPointerUp={finBalayage}
        onPointerCancel={() => (departX.current = undefined)}
        // Le doigt peut glisser à l'horizontale sans que le navigateur confisque le geste.
        style={{ touchAction: "pan-y" }}
      >
        <PalierBienvenue
          key={index}
          palier={palier}
          numero={index + 1}
          total={total}
          classeAnimation={classeAnimation}
          aDroite={
            dernier ? null : (
              <button type="button" onClick={fermer} className={classesBouton("lien")}>
                Passer
              </button>
            )
          }
        />
        <button
          type="button"
          onClick={dernier ? fermer : () => aller(index + 1)}
          className={classesBouton("principal", "grand", "w-full")}
        >
          {dernier ? "Commencer" : "Suivant"}
          {dernier ? null : <Icon name="fleche-droite" size={22} />}
        </button>
      </div>
    </dialog>
  );
}
