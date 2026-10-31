"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { TourAssistant } from "@/lib/conversation/tour";
import { LONGUEUR_MAX_QUESTION } from "@/lib/texte";
import type { CodeErreurVoix } from "@/lib/voix/codes";
import { demarrerEnregistrement, ErreurMicro, type Enregistreur } from "@/lib/voix/enregistreur";
import { envoyerLaVoix } from "@/lib/voix/envoi";
import { erreurDeVoix } from "@/lib/voix/messages";
import { parleurDuNavigateur } from "@/lib/voix/parleur";
import { composerLaQuestion } from "@/lib/voix/question-composee";
import { Icon } from "./Icon";
import { RondMicro } from "./VoixEcrans";

// L'assistant : un bouton, une conversation. La personne touche, parle, et la réponse s'affiche et se lit toute seule ;
// elle retouche pour la question suivante. Le navigateur retient seulement la démarche en cours, le temps de la page.

type Tour = { id: number; question: string } & ({ etat: "attente" } | { etat: "pret"; reponse: TourAssistant } | { etat: "hors_ligne" });
type Phase = "repos" | "demande" | "ecoute" | "transcription";

/** Un enregistrement plus court que ça n'est pas une question. */
const DUREE_MIN_MS = 600;

const LIBELLES: Record<Phase, string> = {
  repos: "Touche et parle",
  demande: "Autorise ton micro",
  ecoute: "Je t’écoute… Touche pour finir",
  transcription: "Je note ta question…",
};

function Reponse({ reponse, surChoix }: { reponse: TourAssistant; surChoix: (slug: string, titre: string) => void }) {
  return (
    <div className="mr-6 rounded-3xl rounded-bl-md bg-card px-[18px] py-4 lg:mr-16">
      {reponse.texte.map((phrase) => (
        <p key={phrase} className="text-[17px] leading-[26px] font-semibold">
          {phrase}
        </p>
      ))}
      {reponse.faits.length > 0 && (
        <dl className="mt-3 space-y-1.5 text-base leading-6">
          {reponse.faits.map(({ libelle, valeur }) => (
            <div key={libelle}>
              <dt className="inline text-ink-2">{libelle} : </dt>
              <dd className="inline font-semibold">{valeur}</dd>
            </div>
          ))}
        </dl>
      )}
      {reponse.pieces.length > 0 && (
        <>
          <p className="mt-3 text-base leading-6 text-ink-2">À apporter :</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base leading-6">
            {reponse.pieces.map((piece) => (
              <li key={piece}>{piece}</li>
            ))}
          </ul>
        </>
      )}
      {reponse.options.length > 0 && (
        <div className="mt-3 flex flex-col items-start gap-2">
          {reponse.options.map(({ slug, titre }) => (
            <button
              key={slug}
              type="button"
              onClick={() => surChoix(slug, titre)}
              className="press min-h-11 rounded-full border border-line px-4 text-left text-[15px] leading-5 font-semibold hover:bg-tint-2"
            >
              {titre}
            </button>
          ))}
        </div>
      )}
      {reponse.fiche && (
        <p className="mt-3 border-t border-line pt-3 text-sm leading-5 text-ink-2">
          {reponse.fiche.source && <>Source : {reponse.fiche.source}. </>}
          <Link href={`/demarches/${reponse.fiche.slug}`} className="font-semibold text-leaf underline underline-offset-4">
            Voir le détail
          </Link>
        </p>
      )}
    </div>
  );
}

export function Conversation() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [phase, setPhase] = useState<Phase>("repos");
  const [erreur, setErreur] = useState<CodeErreurVoix | null>(null);
  const [ecrire, setEcrire] = useState(false);
  const [texte, setTexte] = useState("");
  const enregistreur = useRef<Enregistreur | undefined>(undefined);
  const jeton = useRef(0);
  const compteur = useRef(0);
  /** La démarche dont on parle, et la question trop vague que la prochaine parole complète. */
  const memoire = useRef<{ contexte?: string; aCompleter?: string }>({});
  const bas = useRef<HTMLDivElement>(null);

  const parleur = parleurDuNavigateur();
  const parle = useSyncExternalStore(parleur.abonner, () => parleur.etat() === "lecture", () => false);
  const attente = tours.at(-1)?.etat === "attente";

  useEffect(() => {
    if (tours.length > 0) bas.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [tours]);

  // Quitter la page coupe le micro et la voix.
  useEffect(
    () => () => {
      jeton.current += 1;
      enregistreur.current?.annuler();
      parleurDuNavigateur().arreter();
    },
    [],
  );

  async function poser(affichee: string, question: string, ficheSlug?: string) {
    const id = ++compteur.current;
    const changer = (tour: Tour) => setTours((liste) => liste.map((autre) => (autre.id === id ? tour : autre)));
    setErreur(null);
    setTours((liste) => [...liste, { id, question: affichee, etat: "attente" }]);
    try {
      const reponse = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, fiche: ficheSlug, contexte: memoire.current.contexte }),
      });
      if (!reponse.ok) throw new Error("réponse refusée");
      const tour = (await reponse.json()) as TourAssistant;
      memoire.current = { contexte: tour.fiche?.slug ?? memoire.current.contexte, aCompleter: tour.aCompleter ? question : undefined };
      changer({ id, question: affichee, etat: "pret", reponse: tour });
      parleurDuNavigateur().lire(tour.lignes);
    } catch {
      changer({ id, question: affichee, etat: "hors_ligne" });
    }
  }

  /** Une question nouvelle, ou le complément de la question trop vague d'avant. */
  function poserLaSuite(dite: string) {
    void poser(dite, composerLaQuestion(memoire.current.aCompleter, dite));
  }

  async function terminer(monJeton: number) {
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
      poserLaSuite(resultat.texte);
    }
  }

  async function ecouter() {
    const monJeton = ++jeton.current;
    setErreur(null);
    if (!navigator.onLine) {
      setErreur("reseau");
      setEcrire(true);
      return;
    }
    setPhase("demande");
    try {
      const nouveau = await demarrerEnregistrement({
        surSpectre: () => undefined,
        surDureeMax: () => void terminer(monJeton),
        surFinDeParole: () => void terminer(monJeton),
      });
      if (monJeton !== jeton.current) {
        nouveau.annuler();
        return;
      }
      enregistreur.current = nouveau;
      setPhase("ecoute");
    } catch (probleme) {
      if (monJeton !== jeton.current) return;
      setErreur(probleme instanceof ErreurMicro ? probleme.code : "micro_inaccessible");
      setPhase("repos");
    }
  }

  function toucher() {
    if (phase === "ecoute") {
      void terminer(jeton.current);
      return;
    }
    // Pendant l'appui : l'iPhone n'autorise le micro et la voix qu'à ce moment-là.
    parleur.arreter();
    parleur.debloquer();
    void ecouter();
  }

  function envoyerTexte(evenement: FormEvent) {
    evenement.preventDefault();
    const question = texte.trim();
    if (question === "") return;
    parleur.arreter();
    parleur.debloquer();
    setTexte("");
    poserLaSuite(question);
  }

  function choisir(slug: string, titre: string) {
    const derniere = tours.at(-1)?.question ?? titre;
    parleur.arreter();
    parleur.debloquer();
    void poser(titre, derniere, slug);
  }

  const occupe = attente || phase === "demande" || phase === "transcription";
  const libelle = attente ? "Je cherche…" : parle ? "Touche pour poser une autre question" : LIBELLES[phase];
  const vide = tours.length === 0;

  return (
    <div className={`mx-auto flex w-full max-w-[640px] flex-col ${vide ? "my-auto items-center text-center" : "pt-4"}`}>
      {vide && (
        <>
          <h1 className="text-[32px] leading-[38px] font-bold tracking-[-0.01em] text-balance lg:text-[44px] lg:leading-[52px]">
            De quelle démarche <span className="whitespace-nowrap">as-tu</span> besoin&nbsp;?
          </h1>
          <p className="mt-2 text-[17px] leading-6 text-ink-2">Pose ta question, je te réponds.</p>
        </>
      )}

      {!vide && (
        <ol aria-label="La conversation" className="flex flex-col gap-3">
          {tours.map((tour) => (
            <li key={tour.id} className="flex flex-col gap-3">
              <p className="ml-10 self-end rounded-3xl rounded-br-md bg-tint px-4 py-2.5 text-base leading-6 font-semibold">{tour.question}</p>
              {tour.etat === "attente" && <p className="text-base leading-6 text-ink-2">Je cherche…</p>}
              {tour.etat === "pret" && <Reponse reponse={tour.reponse} surChoix={choisir} />}
              {tour.etat === "hors_ligne" && (
                <p className="mr-6 rounded-3xl rounded-bl-md bg-card px-[18px] py-4 text-base leading-6">
                  Je n’arrive pas à joindre le serveur.{" "}
                  <Link href={`/hors-connexion?q=${encodeURIComponent(tour.question)}`} className="font-semibold text-leaf underline underline-offset-4">
                    Chercher sur le téléphone
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <div ref={bas} className={`flex flex-col items-center ${vide ? "mt-5" : "mt-6 pb-4"}`}>
        <button type="button" onClick={toucher} disabled={occupe} aria-pressed={phase === "ecoute"} className="press flex flex-col items-center gap-2 rounded-[40px] disabled:opacity-60">
          <RondMicro zone={vide ? "size-48" : "size-28"} bouton={vide ? "size-28" : "size-16"} icone={vide ? "size-12" : "size-7"} />
          <span className="text-lg leading-6 font-bold">{libelle}</span>
        </button>

        <p role="status" className="mt-2 min-h-6 max-w-[420px] text-center text-base leading-6 text-ink-2">
          {erreur ? erreurDeVoix(erreur).message : ""}
        </p>

        {ecrire ? (
          <form onSubmit={envoyerTexte} className="relative mt-2 w-full">
            <label htmlFor="question-conversation" className="sr-only">
              Écris ta question
            </label>
            <input
              id="question-conversation"
              type="text"
              value={texte}
              onChange={(evenement) => setTexte(evenement.target.value)}
              maxLength={LONGUEUR_MAX_QUESTION}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Écris ta question"
              className="block h-14 w-full rounded-full border-[1.5px] border-edge bg-card pr-16 pl-[22px] text-[17px] leading-6 text-ink placeholder:text-ink-3 focus:border-leaf"
            />
            <button type="submit" aria-label="Envoyer" className="press absolute top-1.5 right-1.5 flex size-11 items-center justify-center rounded-full bg-brand text-on-brand">
              <Icon name="fleche-droite" size={22} strokeWidth={2.4} />
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setEcrire(true)} className="min-h-11 text-[15px] leading-5 font-semibold text-ink-2 underline underline-offset-4">
            Je préfère écrire
          </button>
        )}
      </div>
    </div>
  );
}
