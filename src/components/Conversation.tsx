"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { codeAppareil } from "@/lib/appareil";
import { stockageLocal } from "@/lib/bienvenue";
import { CLE_DISCUSSION, fermerDiscussion, garderConversation, PARAMETRE_CONVERSATION, retrouverConversation, toursAGarder, type Memoire, type Tour } from "@/lib/conversation/historique";
import type { TourAssistant } from "@/lib/conversation/tour";
import { appareilExclu, voixAutomatique } from "@/lib/preferences";
import { LONGUEUR_MAX_QUESTION } from "@/lib/texte";
import type { CodeErreurVoix } from "@/lib/voix/codes";
import { demarrerEnregistrement, ErreurMicro, type Enregistreur } from "@/lib/voix/enregistreur";
import { envoyerLaVoix } from "@/lib/voix/envoi";
import { erreurDeVoix } from "@/lib/voix/messages";
import type { LigneVocale } from "@/lib/voix/lecture";
import { parleurDuNavigateur } from "@/lib/voix/parleur";
import { composerLaQuestion } from "@/lib/voix/question-composee";
import { formaterDuree, NOMBRE_DE_BARRES } from "@/lib/voix/spectre";
import { AvisReponse } from "./AvisReponse";
import { BoutonPartager } from "./BoutonPartager";
import { Icon, type IconName } from "./Icon";
import { HAUTEUR_BARRE_MAX, HAUTEUR_BARRE_MIN, Spectre } from "./VoixEcrans";

// L'assistant, en trois écrans comme une application : l'accueil et son bouton ; l'écoute en plein écran (la voix fait
// bouger le spectre, un bouton envoie) ; puis la conversation, où la réponse s'affiche et se lit toute seule.
// Les conversations restent sur le téléphone, dans l'historique (voir historique.ts).

type Phase = "repos" | "demande" | "ecoute" | "transcription";

/** Un enregistrement plus court que ça n'est pas une question. */
const DUREE_MIN_MS = 600;

/** Hauteur des barres du spectre dans la barre du bas de la conversation, en pixels. */
const BARRE_COMPACTE_MIN = 4;
const BARRE_COMPACTE_MAX = 36;

/** Lit à voix haute sans qu'on le demande, sauf si la personne l'a coupé dans les réglages. */
function lireSiActif(lignes: LigneVocale[]) {
  if (voixAutomatique(stockageLocal())) parleurDuNavigateur().lire(lignes);
}

/** Note un passage vers e-Sénégal, sans retenir la page qui s'ouvre. */
function noterPassage(fiche: string | undefined) {
  if (appareilExclu(stockageLocal())) return;
  try {
    navigator.sendBeacon("/api/evenement", new Blob([JSON.stringify({ fiche, appareil: codeAppareil(stockageLocal()) })], { type: "application/json" }));
  } catch {
    // Une mesure en moins : le lien s'ouvre quand même.
  }
}

function Orbe({ taille, icone, tourne = false }: { taille: string; icone: string; tourne?: boolean }) {
  return (
    <span aria-hidden="true" className={`orbe ${tourne ? "orbe-tourne" : ""} ${taille}`}>
      {tourne ? <Icon name="loupe" className={`relative ${icone}`} /> : <Icon name="micro" strokeWidth={2} className={`relative ${icone}`} />}
    </span>
  );
}

function Fait({ icone, libelle, children }: { icone: IconName; libelle: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-xl bg-tint text-leaf">
        <Icon name={icone} size={19} />
      </span>
      <div className="min-w-0">
        <dt className="text-[13px] leading-[18px] text-ink-2">{libelle}</dt>
        <dd className="text-[15px] leading-[22px] font-semibold">{children}</dd>
      </div>
    </div>
  );
}

const ICONES_FAITS: Record<string, IconName> = { Coût: "billet", Délai: "horloge", Où: "lieu" };

function Reponse({
  reponse,
  enLecture,
  demanderAvis,
  surChoix,
  surEcouter,
}: {
  reponse: TourAssistant;
  enLecture: boolean;
  /** La dernière réponse de la conversation, qui vient d'arriver : on demande si elle a aidé. */
  demanderAvis: boolean;
  surChoix: (slug: string, titre: string) => void;
  surEcouter: () => void;
}) {
  return (
    <div className="carte-reponse montee">
      {reponse.texte.map((phrase) => (
        <p key={phrase} className="text-[18px] leading-[27px] font-semibold tracking-[-0.005em]">
          {phrase}
        </p>
      ))}
      {reponse.faits.length > 0 && (
        <dl className="mt-4 flex flex-col gap-3">
          {reponse.faits.map(({ libelle, valeur }) => (
            <Fait key={libelle} icone={ICONES_FAITS[libelle] ?? "info"} libelle={libelle}>
              {valeur}
            </Fait>
          ))}
        </dl>
      )}
      {reponse.pieces.length > 0 && (
        <div className="mt-4 rounded-2xl bg-tint p-3.5">
          <p className="text-[13px] leading-[18px] font-semibold text-ink-2">À apporter</p>
          <ul className="mt-2 flex flex-col gap-2 text-[15px] leading-[22px]">
            {reponse.pieces.map((piece) => (
              <li key={piece} className="flex gap-2.5">
                <Icon name="coche" size={18} strokeWidth={2.6} className="mt-0.5 flex-none text-leaf" />
                <span>{piece}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {reponse.miseEnGarde && (
        <p className="mt-4 flex gap-2.5 rounded-2xl border border-edge px-3.5 py-3 text-[14px] leading-5">
          <Icon name="info" size={18} className="mt-px flex-none text-leaf" />
          <span>{reponse.miseEnGarde}</span>
        </p>
      )}
      {reponse.options.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {reponse.options.map(({ slug, titre }) => (
            <button
              key={slug}
              type="button"
              onClick={() => surChoix(slug, titre)}
              className="press flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-tint px-4 py-2.5 text-left text-[15px] leading-5 font-semibold hover:bg-tint-2"
            >
              {titre}
              <Icon name="fleche-droite" size={18} className="flex-none text-leaf" />
            </button>
          ))}
        </div>
      )}
      {reponse.enLigne && (
        <a
          href={reponse.enLigne.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => noterPassage(reponse.fiche?.slug)}
          className="press mt-4 flex min-h-11 items-center gap-2.5 rounded-2xl border border-line px-3.5 py-2.5 text-[15px] leading-5 font-semibold"
        >
          <Icon name="lien-externe" size={18} className="flex-none text-leaf" />
          {reponse.enLigne.note}
        </a>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" onClick={surEcouter} className="press flex min-h-11 items-center gap-2 rounded-full bg-tint px-4 text-[15px] leading-5 font-semibold">
          <Icon name={enLecture ? "arreter" : "haut-parleur"} size={19} />
          {enLecture ? "Arrêter" : "Réécouter"}
        </button>
        {reponse.fiche && <BoutonPartager compact fiche={{ slug: reponse.fiche.slug, titre: reponse.fiche.titre, resume: reponse.fiche.resume ?? reponse.fiche.titre }} />}
        {reponse.fiche && (
          <Link href={`/demarches/${reponse.fiche.slug}`} className="flex min-h-11 items-center text-[15px] leading-5 font-semibold text-leaf underline-offset-4 hover:underline">
            Voir le détail
          </Link>
        )}
      </div>
      {reponse.fiche?.source && <p className="mt-2 text-[13px] leading-[18px] text-ink-3">Source : {reponse.fiche.source}</p>}
      {demanderAvis && reponse.fiche && reponse.journalId && <AvisReponse key={reponse.journalId} journalId={reponse.journalId} />}
    </div>
  );
}

export function Conversation() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [phase, setPhase] = useState<Phase>("repos");
  const [erreur, setErreur] = useState<CodeErreurVoix | null>(null);
  const [ecrire, setEcrire] = useState(false);
  const [texte, setTexte] = useState("");
  const [ecouleMs, setEcouleMs] = useState(0);
  const [lu, setLu] = useState<number | null>(null);
  const enregistreur = useRef<Enregistreur | undefined>(undefined);
  const barres = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLTextAreaElement>(null);
  const debutMs = useRef(0);
  const jeton = useRef(0);
  const compteur = useRef(0);
  /** Change au retour à l'accueil : une réponse encore en route ne concerne plus l'écran. */
  const session = useRef(0);
  /** La démarche dont on parle, et la question trop vague que la prochaine parole complète. */
  const memoire = useRef<Memoire>({});
  /** La conversation dans l'historique, et le nombre de réponses déjà gardées : rouvrir ne la remonte pas en tête de liste. */
  const idConversation = useRef<string | undefined>(undefined);
  const reponsesGardees = useRef(0);
  const bas = useRef<HTMLDivElement>(null);

  const enConversation = useRef(false);

  const parleur = parleurDuNavigateur();
  const parle = useSyncExternalStore(parleur.abonner, () => parleur.etat() === "lecture", () => false);
  const attente = tours.at(-1)?.etat === "attente";

  // Après le premier dessin (le serveur ne connaît pas l'onglet) : on retrouve la discussion en cours.
  useEffect(() => {
    // Next garde l'écran en mémoire, caché, et le réaffiche : lu ici, avant que la discussion affichée soit de nouveau notée.
    let fermee = false;
    try {
      fermee = sessionStorage.getItem(CLE_DISCUSSION) === null;
    } catch {
      // Mémoire de l'onglet bloquée : l'écran garde ce qu'il affiche.
    }
    const trame = requestAnimationFrame(() => {
      try {
        const reprendre = (id: string | undefined, tours: Tour[], memoireGardee: Memoire) => {
          compteur.current = Math.max(0, ...tours.map((tour) => tour.id));
          memoire.current = memoireGardee;
          idConversation.current = id;
          reponsesGardees.current = toursAGarder(tours).length;
          setTours(tours);
        };
        // Depuis l'historique : l'adresse redevient celle de l'accueil, et le retour ramène à la liste.
        const demandee = new URLSearchParams(window.location.search).get(PARAMETRE_CONVERSATION);
        if (demandee) {
          window.history.replaceState({ ...window.history.state, discussion: true }, "", "/");
          const conversation = retrouverConversation(stockageLocal(), demandee);
          session.current += 1;
          // Une réponse rouverte ne redemande pas d'avis : la personne l'a peut-être déjà donné.
          if (conversation) reprendre(conversation.id, conversation.tours.map((tour) => ({ ...tour, reponse: { ...tour.reponse, journalId: undefined } })), conversation.memoire);
          return;
        }
        if (fermee) {
          session.current += 1;
          fermerDiscussion();
          reprendre(undefined, [], {});
          return;
        }
        const gardee = JSON.parse(sessionStorage.getItem(CLE_DISCUSSION) ?? "null") as { id?: string; tours: Tour[]; memoire: Memoire } | null;
        if (gardee) reprendre(gardee.id, gardee.tours.filter((tour) => tour.etat !== "attente"), gardee.memoire);
      } catch {
        // Mémoire de l'onglet bloquée ou illisible : on repart de l'accueil.
      }
    });
    return () => cancelAnimationFrame(trame);
  }, []);

  useEffect(() => {
    try {
      if (tours.length > 0) sessionStorage.setItem(CLE_DISCUSSION, JSON.stringify({ id: idConversation.current, tours, memoire: memoire.current }));
    } catch {
      // Sans mémoire d'onglet, la discussion dure seulement le temps de la page.
    }
    // Une nouvelle réponse : la conversation est gardée dans l'historique.
    const pretes = toursAGarder(tours);
    if (idConversation.current && pretes.length > reponsesGardees.current) {
      reponsesGardees.current = pretes.length;
      garderConversation(stockageLocal(), { id: idConversation.current, maj: Date.now(), tours: pretes, memoire: memoire.current });
    }
    bas.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [tours]);

  // Une erreur est aussi dite à voix haute : tout le monde ne peut pas la lire.
  useEffect(() => {
    if (erreur) lireSiActif([{ texte: erreurDeVoix(erreur).message, cible: null }]);
  }, [erreur]);

  // Le chronomètre de l'écoute.
  useEffect(() => {
    if (phase !== "ecoute") return;
    const minuteur = setInterval(() => setEcouleMs(performance.now() - debutMs.current), 250);
    return () => clearInterval(minuteur);
  }, [phase]);

  // Le geste « retour » du téléphone ramène de la conversation à l'accueil ; quitter la page coupe le micro et la voix.
  useEffect(() => {
    const surRetour = () => reinitialiser();
    window.addEventListener("popstate", surRetour);
    return () => {
      window.removeEventListener("popstate", surRetour);
      jeton.current += 1;
      enregistreur.current?.annuler();
      parleurDuNavigateur().arreter();
    };

    /** Tout s'arrête et l'écran se vide (la conversation reste dans l'historique) : on revient à l'accueil. */
    function reinitialiser() {
      session.current += 1;
      jeton.current += 1;
      enregistreur.current?.annuler();
      enregistreur.current = undefined;
      parleurDuNavigateur().arreter();
      memoire.current = {};
      idConversation.current = undefined;
      reponsesGardees.current = 0;
      fermerDiscussion();
      setTours([]);
      setPhase("repos");
      setErreur(null);
      setEcrire(false);
    }
  }, []);

  function retourAccueil() {
    // Une discussion retrouvée n'a pas d'étape dans l'historique : on en crée une, pour que le retour passe par le même chemin.
    if (!(window.history.state as { discussion?: boolean } | null)?.discussion) window.history.pushState({ ...window.history.state, discussion: true }, "");
    window.history.back();
  }

  async function poser(affichee: string, question: string, ficheSlug?: string, canal?: "voice") {
    if (tours.length === 0) window.history.pushState({ ...window.history.state, discussion: true }, "");
    idConversation.current ??= String(Date.now());
    const id = ++compteur.current;
    const maSession = session.current;
    const changer = (tour: Tour) => setTours((liste) => liste.map((autre) => (autre.id === id ? tour : autre)));
    setErreur(null);
    setEcrire(false);
    setTours((liste) => [...liste, { id, question: affichee, etat: "attente" }]);
    try {
      const reponse = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, fiche: ficheSlug, contexte: memoire.current.contexte, canal, appareil: codeAppareil(stockageLocal()), ...(appareilExclu(stockageLocal()) ? { nonCompte: true } : {}) }),
      });
      if (!reponse.ok) throw new Error("réponse refusée");
      const tour = (await reponse.json()) as TourAssistant;
      if (maSession !== session.current) return;
      memoire.current = { contexte: tour.fiche?.slug ?? memoire.current.contexte, aCompleter: tour.aCompleter ? question : undefined };
      changer({ id, question: affichee, etat: "pret", reponse: tour });
      setLu(id);
      lireSiActif(tour.lignes);
    } catch {
      if (maSession !== session.current) return;
      changer({ id, question: affichee, etat: "hors_ligne" });
      lireSiActif([{ texte: "Je n’arrive pas à joindre le serveur. Réessaie dans un moment.", cible: null }]);
    }
  }

  /** Une question nouvelle, ou le complément de la question trop vague d'avant. */
  function poserLaSuite(dite: string, canal?: "voice") {
    void poser(dite, composerLaQuestion(memoire.current.aCompleter, dite), undefined, canal);
  }

  /** Lève ou baisse chaque barre selon la voix (directement dans la page : 60 images par seconde sans repasser par React). */
  function dessiner(hauteurs: number[]) {
    const elements = barres.current?.children;
    if (!elements) return;
    // Dans la conversation, le spectre tient dans la barre du bas.
    const compacte = enConversation.current;
    const minimum = compacte ? BARRE_COMPACTE_MIN : HAUTEUR_BARRE_MIN;
    const maximum = compacte ? BARRE_COMPACTE_MAX : HAUTEUR_BARRE_MAX;
    hauteurs.forEach((hauteur, i) => {
      const barre = elements[i];
      if (barre instanceof HTMLElement) barre.style.height = `${minimum + hauteur * (maximum - minimum)}px`;
    });
  }

  async function envoyer(monJeton: number) {
    const enCours = enregistreur.current;
    if (!enCours || monJeton !== jeton.current) return;
    enregistreur.current = undefined;
    setPhase("transcription");
    const enregistrement = await enCours.terminer();
    if (monJeton !== jeton.current) return;
    if (!enregistrement.voixEntendue || enregistrement.dureeMs < DUREE_MIN_MS) {
      setErreur("rien_entendu");
      setPhase("repos");
      return;
    }
    const resultat = await envoyerLaVoix(enregistrement.audio);
    if (monJeton !== jeton.current) return;
    setPhase("repos");
    if (!resultat.ok) {
      if (resultat.code !== "annule") setErreur(resultat.code);
    } else if (resultat.texte === "") {
      setErreur("rien_entendu");
    } else {
      poserLaSuite(resultat.texte, "voice");
    }
  }

  async function ecouter() {
    const monJeton = ++jeton.current;
    enConversation.current = tours.length > 0;
    setErreur(null);
    if (!navigator.onLine) {
      setErreur("reseau");
      setEcrire(true);
      return;
    }
    setPhase("demande");
    try {
      const nouveau = await demarrerEnregistrement({ surSpectre: dessiner, surDureeMax: () => void envoyer(monJeton) });
      if (monJeton !== jeton.current) {
        nouveau.annuler();
        return;
      }
      enregistreur.current = nouveau;
      debutMs.current = performance.now();
      setEcouleMs(0);
      setPhase("ecoute");
    } catch (probleme) {
      if (monJeton !== jeton.current) return;
      setErreur(probleme instanceof ErreurMicro ? probleme.code : "micro_inaccessible");
      setPhase("repos");
    }
  }

  function toucherMicro() {
    // Pendant l'appui : l'iPhone n'autorise le micro et la voix qu'à ce moment-là.
    parleur.arreter();
    parleur.debloquer();
    void ecouter();
  }

  function annulerEcoute() {
    jeton.current += 1;
    enregistreur.current?.annuler();
    enregistreur.current = undefined;
    setPhase("repos");
  }

  function ouvrirEcriture() {
    // Le champ prend le curseur pendant l'appui : sinon l'iPhone n'ouvre pas le clavier.
    flushSync(() => setEcrire(true));
    champ.current?.focus();
  }

  function envoyerTexte(evenement: FormEvent | KeyboardEvent) {
    evenement.preventDefault();
    const question = texte.trim();
    if (question === "") return;
    parleur.arreter();
    parleur.debloquer();
    setTexte("");
    poserLaSuite(question);
  }

  function ecouterEncore(id: number, reponse: TourAssistant) {
    if (parle && lu === id) {
      parleur.arreter();
      return;
    }
    setLu(id);
    parleur.lire(reponse.lignes);
  }

  function choisir(slug: string, titre: string) {
    const derniere = tours.at(-1)?.question ?? titre;
    parleur.arreter();
    parleur.debloquer();
    void poser(titre, derniere, slug);
  }

  const messageErreur = (
    <p role="status" className="mx-auto min-h-6 max-w-[420px] text-center text-[15px] leading-[22px] text-ink-2">
      {erreur ? erreurDeVoix(erreur).message : ""}
    </p>
  );

  return (
    <>
      {/* L'accueil : le titre et le bouton, rien d'autre. */}
      <div className="mx-auto my-auto flex w-full max-w-[560px] flex-col items-center py-2 text-center [@media(min-height:700px)]:py-6">
        <p className="montee rounded-full bg-tint px-3.5 py-1.5 text-[13px] leading-[18px] font-semibold text-leaf-deep">Sources officielles du Sénégal</p>
        <h1 className="montee mt-4 text-[38px] leading-[42px] font-bold tracking-[-0.03em] text-balance lg:text-[56px] lg:leading-[60px]">
          De quelle démarche <span className="whitespace-nowrap">as-tu</span> besoin&nbsp;?
        </h1>
        <button type="button" onClick={toucherMicro} className="press montee mt-10 flex [@media(min-height:700px)]:mt-16 flex-col items-center rounded-[48px]">
          <Orbe taille="size-24 [@media(min-height:700px)]:size-36" icone="size-10 [@media(min-height:700px)]:size-14" />
          <span className="mt-10 text-xl [@media(min-height:700px)]:mt-14 leading-7 font-bold">Touche et parle</span>
        </button>
        <div className="mt-4 w-full">{tours.length === 0 && phase === "repos" && !ecrire ? messageErreur : null}</div>
        <div className="mt-1 flex w-full justify-center">
          <button type="button" onClick={ouvrirEcriture} className="min-h-11 text-[15px] leading-5 font-semibold text-ink-2 underline-offset-4 hover:underline">
              Je préfère écrire
            </button>
        </div>
      </div>

      {/* La conversation : un écran à elle, sans le menu. */}
      {tours.length > 0 && (
        <section aria-label="La conversation" className="ecran ecran-entree z-40 flex flex-col">
          <header className="flex flex-none items-center gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <button type="button" onClick={retourAccueil} aria-label="Retour à l’accueil" className="press flex size-11 items-center justify-center rounded-full bg-card">
              <Icon name="fleche-gauche" />
            </button>
            <p className="text-[17px] leading-6 font-bold tracking-[-0.01em]">
              Démarche<span className="text-leaf">-Bi</span>
            </p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <ol className="mx-auto flex w-full max-w-[640px] flex-col gap-4 pt-2 pb-4">
              {tours.map((tour) => (
                <li key={tour.id} className="flex flex-col gap-3">
                  <p className="montee ml-12 self-end rounded-[22px] rounded-br-md bg-brand px-4 py-2.5 text-base leading-6 font-semibold text-on-brand">{tour.question}</p>
                  {tour.etat === "attente" && <p className="text-[15px] leading-6 text-ink-2">Je cherche…</p>}
                  {tour.etat === "pret" && (
                    <Reponse reponse={tour.reponse} demanderAvis={tour.id === tours.at(-1)?.id}
                    enLecture={parle && lu === tour.id} surChoix={choisir} surEcouter={() => ecouterEncore(tour.id, tour.reponse)} />
                  )}
                  {tour.etat === "hors_ligne" && (
                    <p className="carte-reponse montee text-base leading-6">
                      Je n’arrive pas à joindre le serveur.{" "}
                      <Link href={`/hors-connexion?q=${encodeURIComponent(tour.question)}`} className="font-semibold text-leaf underline underline-offset-4">
                        Chercher sur le téléphone
                      </Link>
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <div ref={bas} />
          </div>
          <div className="mx-auto flex w-full max-w-[640px] flex-none flex-col items-center gap-2 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {erreur && !ecrire && messageErreur}
            {phase !== "repos" && (
              <div className="montee flex h-16 w-full items-center gap-2.5 rounded-full border border-line bg-card pr-1.5 pl-2">
                <button type="button" onClick={annulerEcoute} aria-label="Annuler" className="press flex size-11 flex-none items-center justify-center rounded-full bg-tint">
                  <Icon name="croix" size={18} />
                </button>
                {phase === "ecoute" ? (
                  <>
                    <div ref={barres} role="img" aria-label="Spectre de ta voix en direct" className="flex h-10 min-w-0 flex-1 items-center justify-center gap-px overflow-hidden min-[360px]:gap-[2px]">
                      {Array.from({ length: NOMBRE_DE_BARRES }, (_, i) => (
                        <span key={i} className="block w-[3px] min-w-px shrink rounded-full bg-bar" style={{ height: BARRE_COMPACTE_MIN }} />
                      ))}
                    </div>
                    <p role="timer" className="flex-none text-[15px] leading-5 font-semibold tabular-nums">
                      {formaterDuree(ecouleMs)}
                    </p>
                    <button type="button" onClick={() => void envoyer(jeton.current)} aria-label="Envoyer" className="press flex size-[52px] flex-none items-center justify-center rounded-full bg-brand text-on-brand">
                      <Icon name="fleche-droite" strokeWidth={2.6} className="size-6 -rotate-90" />
                    </button>
                  </>
                ) : (
                  <p role="status" className="min-w-0 flex-1 text-[15px] leading-5 font-semibold text-ink-2">
                    {phase === "demande" ? "Autorise ton micro…" : "Je note ta question…"}
                  </p>
                )}
              </div>
            )}
            <div className={`w-full items-center gap-3 ${phase === "repos" ? "flex" : "hidden"}`}>
                <button type="button" onClick={ouvrirEcriture} className="press flex h-14 min-w-0 flex-1 items-center rounded-full border border-line bg-card px-5 text-left text-base leading-6 text-ink-3">
                  Écrire une question
                </button>
                <button type="button" onClick={toucherMicro} aria-label="Poser une autre question à la voix" className="press flex-none rounded-full">
                  <Orbe taille="size-14 orbe-petit" icone="size-6" />
                </button>
              </div>
          </div>
        </section>
      )}

      {/* Écrire : un écran à part, le champ en haut pour rester au-dessus du clavier du téléphone. */}
      {ecrire && (
        <section role="dialog" aria-modal="true" aria-labelledby="titre-ecrire" className="ecran ecran-entree z-50 flex flex-col">
          <header className="flex flex-none items-center gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <button type="button" onClick={() => setEcrire(false)} aria-label="Fermer" className="press flex size-11 items-center justify-center rounded-full bg-card">
              <Icon name="croix" size={20} />
            </button>
            <h2 id="titre-ecrire" className="text-[17px] leading-6 font-bold tracking-[-0.01em]">
              Écris ta question
            </h2>
          </header>
          <form onSubmit={envoyerTexte} className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 pt-2">
            <label htmlFor="question-conversation" className="sr-only">
              Écris ta question
            </label>
            <textarea
              ref={champ}
              id="question-conversation"
              rows={3}
              value={texte}
              onChange={(evenement) => setTexte(evenement.target.value)}
              onKeyDown={(evenement) => {
                if (evenement.key === "Enter" && !evenement.shiftKey) envoyerTexte(evenement);
              }}
              maxLength={LONGUEUR_MAX_QUESTION}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Par exemple : j’ai perdu ma carte d’identité"
              className="block w-full resize-none rounded-3xl border border-line bg-card px-5 py-4 text-[17px] leading-[26px] text-ink placeholder:text-ink-3 focus:border-leaf"
            />
            {erreur && messageErreur}
            <button
              type="submit"
              disabled={texte.trim() === ""}
              className="press flex h-14 items-center justify-center gap-2 rounded-full bg-brand text-[17px] leading-6 font-bold text-on-brand disabled:opacity-50"
            >
              Envoyer
              <Icon name="fleche-droite" size={22} strokeWidth={2.4} />
            </button>
          </form>
        </section>
      )}

      {/* L'écoute : tout l'écran pour la voix. */}
      {tours.length === 0 && (phase === "demande" || phase === "ecoute") && (
        <section role="dialog" aria-modal="true" aria-labelledby="titre-ecoute" className="ecran ecran-entree z-50 flex flex-col">
          <header className="flex flex-none items-center justify-between px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <button type="button" onClick={annulerEcoute} aria-label="Annuler" className="press flex size-11 items-center justify-center rounded-full bg-card">
              <Icon name="croix" size={20} />
            </button>
            {phase === "ecoute" && (
              <p role="timer" className="flex h-9 items-center gap-2 rounded-full bg-card px-3.5 text-[15px] leading-5 font-semibold tabular-nums">
                <span aria-hidden="true" className="size-2 animate-pulse-dot rounded-full bg-brand" />
                {formaterDuree(ecouleMs)}
              </p>
            )}
          </header>
          <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
            <h2 id="titre-ecoute" className="text-[34px] leading-10 font-bold tracking-[-0.02em]">
              {phase === "demande" ? "Autorise ton micro" : "Je t’écoute…"}
            </h2>
            {phase === "ecoute" ? <Spectre refBarres={barres} /> : <p className="max-w-[280px] text-base leading-6 text-ink-2">Ton navigateur va te demander la permission. Touche « Autoriser ».</p>}
          </div>
          {phase === "ecoute" && (
            <div className="flex flex-none justify-center px-4 pt-2 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => void envoyer(jeton.current)} className="press flex flex-col items-center gap-3">
                <span className="flex size-24 animate-halo items-center justify-center rounded-full bg-brand text-on-brand">
                  <Icon name="fleche-droite" strokeWidth={2.6} className="size-10 -rotate-90" />
                </span>
                <span className="text-xl leading-7 font-bold">Envoyer</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Entre l'envoi et la réponse : on montre que ça travaille, en plein écran. */}
      {((tours.length === 0 && phase === "transcription") || (tours.length === 1 && attente)) && (
        <section role="status" className="ecran ecran-entree z-50 flex flex-col items-center justify-center gap-7 px-6 text-center">
          <Orbe taille="size-32" icone="size-12" tourne />
          <div>
            <h2 className="text-[30px] leading-9 font-bold tracking-[-0.02em]">{phase === "transcription" ? "Je note ta question…" : "Je cherche…"}</h2>
            <p className="mt-2 text-base leading-6 text-ink-2">{phase === "transcription" ? "Un instant." : "Dans les sources officielles."}</p>
          </div>
        </section>
      )}
    </>
  );
}
