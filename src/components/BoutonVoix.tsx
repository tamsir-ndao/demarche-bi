"use client";

import { useEffect, useRef, useState } from "react";
import type { CodeErreurVoix } from "@/lib/voix/codes";
import { demarrerEnregistrement, ErreurMicro, type Enregistreur } from "@/lib/voix/enregistreur";
import { envoyerLaVoix } from "@/lib/voix/envoi";
import {
  HAUTEUR_BARRE_MAX,
  HAUTEUR_BARRE_MIN,
  RondMicro,
  VoixDemande,
  VoixEnregistrement,
  VoixErreur,
  VoixTranscription,
  VoixVerification,
} from "./VoixEcrans";

// Poser sa question à la voix : un bouton sur l'accueil ouvre une fenêtre plein écran où l'on parle (spectre en
// direct), puis où l'on relit le texte reconnu avant de chercher la réponse. Rien n'est gardé : le son va à Whisper
// (voir /api/transcribe), le texte revient ici et reste modifiable.

type Etape =
  | { nom: "inactif" }
  | { nom: "demande" }
  | { nom: "enregistrement" }
  | { nom: "transcription" }
  | { nom: "verification"; texte: string }
  | { nom: "erreur"; code: CodeErreurVoix };

/** Un enregistrement plus court que ça n'est pas une question (un appui trop rapide sur « Terminer »). */
const DUREE_MIN_MS = 600;

export function BoutonVoix({ idChampQuestion }: { idChampQuestion: string }) {
  const [etape, setEtape] = useState<Etape>({ nom: "inactif" });
  const [ecouleMs, setEcouleMs] = useState(0);
  const dialogue = useRef<HTMLDialogElement>(null);
  const barres = useRef<HTMLDivElement>(null);
  const enregistreur = useRef<Enregistreur | undefined>(undefined);
  const envoi = useRef<AbortController | undefined>(undefined);
  const debutMs = useRef(0);
  /** Change à chaque départ et à chaque fermeture : ce qui arrive après ne concerne plus l'écran. */
  const jeton = useRef(0);

  /** Arrête tout ce qui est en cours : micro libéré, envoi abandonné, réponses en retard ignorées. */
  function oublier() {
    jeton.current += 1;
    enregistreur.current?.annuler();
    enregistreur.current = undefined;
    envoi.current?.abort();
    envoi.current = undefined;
  }

  function fermer() {
    oublier();
    setEtape({ nom: "inactif" });
    if (dialogue.current?.open) dialogue.current.close();
  }

  function ecrire() {
    fermer();
    document.getElementById(idChampQuestion)?.focus();
  }

  /** Lève ou baisse chaque barre selon la voix (directement dans la page : 60 images par seconde sans repasser par React). */
  function dessiner(hauteurs: number[]) {
    const elements = barres.current?.children;
    if (!elements) return;
    hauteurs.forEach((hauteur, i) => {
      const barre = elements[i];
      if (barre instanceof HTMLElement) {
        barre.style.height = `${HAUTEUR_BARRE_MIN + hauteur * (HAUTEUR_BARRE_MAX - HAUTEUR_BARRE_MIN)}px`;
      }
    });
  }

  async function terminer(monJeton: number) {
    const enCours = enregistreur.current;
    if (!enCours || monJeton !== jeton.current) return;
    enregistreur.current = undefined;
    setEtape({ nom: "transcription" });

    const enregistrement = await enCours.terminer();
    if (monJeton !== jeton.current) return;
    if (!enregistrement.voixEntendue || enregistrement.dureeMs < DUREE_MIN_MS) {
      setEtape({ nom: "erreur", code: "rien_entendu" });
      return;
    }

    const controleur = new AbortController();
    envoi.current = controleur;
    const resultat = await envoyerLaVoix(enregistrement.audio, { signal: controleur.signal });
    if (monJeton !== jeton.current) return;
    envoi.current = undefined;

    if (!resultat.ok) {
      if (resultat.code !== "annule") setEtape({ nom: "erreur", code: resultat.code });
    } else if (resultat.texte === "") {
      setEtape({ nom: "erreur", code: "rien_entendu" });
    } else {
      setEtape({ nom: "verification", texte: resultat.texte });
    }
  }

  async function demarrer() {
    oublier();
    const monJeton = jeton.current;
    setEtape({ nom: "demande" });

    let nouveau: Enregistreur;
    try {
      nouveau = await demarrerEnregistrement({
        surSpectre: dessiner,
        surDureeMax: () => void terminer(monJeton),
      });
    } catch (erreur) {
      if (monJeton === jeton.current) {
        setEtape({ nom: "erreur", code: erreur instanceof ErreurMicro ? erreur.code : "micro_inaccessible" });
      }
      return;
    }
    if (monJeton !== jeton.current) {
      nouveau.annuler();
      return;
    }
    enregistreur.current = nouveau;
    debutMs.current = performance.now();
    setEcouleMs(0);
    setEtape({ nom: "enregistrement" });
  }

  function ouvrir() {
    // Un très vieux navigateur ne sait pas ouvrir la fenêtre : on renvoie vers le champ de saisie.
    if (typeof dialogue.current?.showModal !== "function") {
      ecrire();
      return;
    }
    // showModal et demarrer s'exécutent pendant l'appui : le navigateur n'autorise le micro et le son qu'à ce moment-là.
    dialogue.current.showModal();
    void demarrer();
  }

  // Le chronomètre de l'enregistrement.
  useEffect(() => {
    if (etape.nom !== "enregistrement") return;
    const minuteur = setInterval(() => setEcouleMs(performance.now() - debutMs.current), 250);
    return () => clearInterval(minuteur);
  }, [etape.nom]);

  // À chaque nouvel écran, le titre prend le focus : le lecteur d'écran annonce où l'on est.
  useEffect(() => {
    if (etape.nom !== "inactif") dialogue.current?.querySelector<HTMLElement>("[data-titre-voix]")?.focus();
  }, [etape.nom]);

  // Quitter la page (ou la voir cachée par la navigation) coupe le micro et ferme la fenêtre.
  useEffect(() => {
    const fenetre = dialogue;
    return () => {
      oublier();
      if (fenetre.current?.open) fenetre.current.close();
    };
    // oublier ne dépend que de refs : il n'a pas besoin d'être relancé.
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        className="press flex flex-col items-center gap-3 rounded-[40px] lg:flex-row lg:gap-5"
      >
        <RondMicro zone="size-48 lg:size-32" bouton="size-28 lg:size-[76px]" icone="size-12 lg:size-[34px]" />
        <span className="text-lg leading-6 font-bold lg:text-xl lg:leading-7">Appuie et parle</span>
      </button>

      <dialog
        ref={dialogue}
        aria-labelledby="titre-voix"
        onClose={fermer}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-left text-ink backdrop:bg-transparent"
      >
        {etape.nom === "demande" && <VoixDemande onFermer={fermer} />}
        {etape.nom === "enregistrement" && (
          <VoixEnregistrement
            ecouleMs={ecouleMs}
            refBarres={barres}
            onTerminer={() => void terminer(jeton.current)}
            onFermer={fermer}
          />
        )}
        {etape.nom === "transcription" && <VoixTranscription onFermer={fermer} />}
        {etape.nom === "verification" && (
          <VoixVerification
            texteInitial={etape.texte}
            onRecommencer={() => void demarrer()}
            onEnvoi={fermer}
            onFermer={fermer}
          />
        )}
        {etape.nom === "erreur" && (
          <VoixErreur code={etape.code} onReessayer={() => void demarrer()} onEcrire={ecrire} onFermer={fermer} />
        )}
      </dialog>
    </>
  );
}
