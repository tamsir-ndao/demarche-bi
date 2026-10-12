import Form from "next/form";
import { memo, useState, type ReactNode, type RefObject } from "react";
import { erreurDeVoix } from "@/lib/voix/messages";
import type { CodeErreurVoix } from "@/lib/voix/codes";
import { formaterDuree, NOMBRE_DE_BARRES } from "@/lib/voix/spectre";
import { collerLaPonctuation, LONGUEUR_MAX_QUESTION } from "@/lib/texte";
import { Icon } from "./Icon";
import { classesBouton } from "./LienBouton";

// Les écrans de la voix (maquettes « Voix » et « Transcription ») : chacun remplit la fenêtre, avec la croix en haut.
// L'état et le micro sont gérés par BoutonVoix ; ici on ne fait que montrer.

/** Hauteur des barres du spectre, en pixels : une barre sans son reste un petit point. */
export const HAUTEUR_BARRE_MIN = 12;
export const HAUTEUR_BARRE_MAX = 152;

/** Le titre de l'écran : il reçoit le focus à chaque changement d'écran pour que le lecteur d'écran l'annonce. */
const ATTRIBUTS_TITRE = { id: "titre-voix", tabIndex: -1, "data-titre-voix": "" } as const;

/** Le fond remplit la fenêtre ; le contenu tient dans une colonne de la largeur d'un téléphone, même sur un grand écran. */
function Ecran({ fond, children }: { fond: "teinte" | "page"; children: ReactNode }) {
  return (
    <div className={fond === "teinte" ? "bg-tint" : "bg-page"}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">{children}</div>
    </div>
  );
}

function EnTete({ onFermer, children }: { onFermer: () => void; children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 py-1.5">
      <button
        type="button"
        onClick={onFermer}
        aria-label="Annuler"
        className="press flex size-11 items-center justify-center rounded-full bg-card shadow-soft"
      >
        <Icon name="croix" size={20} />
      </button>
      {children}
    </header>
  );
}

/** Le micro vert entouré de deux cercles qui respirent (même image que le bouton de l'accueil). */
export function RondMicro({ zone, bouton, icone }: { zone: string; bouton: string; icone: string }) {
  return (
    <span aria-hidden="true" className={`relative flex items-center justify-center ${zone}`}>
      <span className="absolute inset-0 animate-breathe rounded-full bg-tint" />
      <span className="absolute inset-[10%] animate-breathe rounded-full bg-tint-2 [animation-delay:0.5s]" />
      <span
        className={`relative flex items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_12px_28px_rgb(34_209_131_/_0.45)] ${bouton}`}
      >
        <Icon name="micro" strokeWidth={2} className={icone} />
      </span>
    </span>
  );
}

/** Le navigateur demande l'autorisation d'utiliser le micro (la fenêtre de demande est celle du navigateur). */
export function VoixDemande({ onFermer }: { onFermer: () => void }) {
  return (
    <Ecran fond="teinte">
      <EnTete onFermer={onFermer} />
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
        <RondMicro zone="size-[168px]" bouton="size-24" icone="size-10" />
        <div>
          <h2 {...ATTRIBUTS_TITRE} className="text-[30px] leading-9 font-bold tracking-[-0.01em] focus:outline-none">
            Autorise ton micro
          </h2>
          <p className="mx-auto mt-2.5 max-w-[280px] text-base leading-6 text-ink-2">
            Ton navigateur va te demander la permission. Touche « Autoriser ».
          </p>
        </div>
      </div>
    </Ecran>
  );
}

/** Les barres du spectre : BoutonVoix change leur hauteur à chaque image, sans repasser par React. */
const Spectre = memo(function Spectre({ refBarres }: { refBarres: RefObject<HTMLDivElement | null> }) {
  return (
    <div role="img" aria-label="Spectre de ta voix en direct" className="relative h-[170px] w-full">
      <span aria-hidden="true" className="absolute inset-x-3 top-1/2 h-px bg-tint-2" />
      <div ref={refBarres} className="absolute inset-0 flex items-center justify-center gap-1 min-[360px]:gap-[5px]">
        {Array.from({ length: NOMBRE_DE_BARRES }, (_, i) => (
          <span
            key={i}
            className="block w-[5px] flex-none rounded-[4px] bg-bar min-[360px]:w-[7px]"
            style={{ height: HAUTEUR_BARRE_MIN }}
          />
        ))}
      </div>
    </div>
  );
});

export function VoixEnregistrement({
  ecouleMs,
  refBarres,
  onTerminer,
  onFermer,
}: {
  ecouleMs: number;
  refBarres: RefObject<HTMLDivElement | null>;
  onTerminer: () => void;
  onFermer: () => void;
}) {
  return (
    <Ecran fond="teinte">
      <EnTete onFermer={onFermer}>
        <p
          role="timer"
          aria-label="Durée de l’enregistrement"
          className="flex h-9 items-center gap-2 rounded-full bg-card px-3.5 text-[15px] leading-5 font-semibold tabular-nums shadow-soft"
        >
          <span aria-hidden="true" className="size-2 animate-pulse-dot rounded-full bg-brand" />
          {formaterDuree(ecouleMs)}
        </p>
      </EnTete>
      <div className="flex flex-1 flex-col items-center justify-center gap-9 px-4 text-center">
        <div>
          <h2 {...ATTRIBUTS_TITRE} className="text-4xl leading-[42px] font-bold tracking-[-0.01em] focus:outline-none">
            Je t’écoute…
          </h2>
          <p className="mx-auto mt-2.5 max-w-[280px] text-base leading-6 text-ink-2">
            Dis ta question, puis touche Terminer.
          </p>
        </div>
        <Spectre refBarres={refBarres} />
      </div>
      <div className="flex justify-center px-4 pt-2 pb-10">
        <button type="button" onClick={onTerminer} className="press flex flex-col items-center gap-3">
          <span className="flex size-24 animate-halo items-center justify-center rounded-full bg-brand">
            <span aria-hidden="true" className="size-[30px] rounded-lg bg-on-brand" />
          </span>
          <span className="text-[17px] leading-6 font-bold">Terminer</span>
        </button>
      </div>
    </Ecran>
  );
}

/** Le son est parti chez Whisper : on attend le texte. */
export function VoixTranscription({ onFermer }: { onFermer: () => void }) {
  return (
    <Ecran fond="teinte">
      <EnTete onFermer={onFermer} />
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
        <RondMicro zone="size-[168px]" bouton="size-24" icone="size-10" />
        <h2 {...ATTRIBUTS_TITRE} className="text-[30px] leading-9 font-bold tracking-[-0.01em] focus:outline-none">
          J’écris ce que tu as dit…
        </h2>
      </div>
    </Ecran>
  );
}

/** « C'est bien ça ? » : le texte reconnu, à corriger avant de chercher la réponse (même chemin que le champ de l'accueil). */
export function VoixVerification({
  texteInitial,
  onRecommencer,
  onEnvoi,
  onFermer,
}: {
  texteInitial: string;
  onRecommencer: () => void;
  /** Appelé au moment où la question part : l'écran de la voix se ferme, la page de réponse prend le relais. */
  onEnvoi: () => void;
  onFermer: () => void;
}) {
  const [texte, setTexte] = useState(() => collerLaPonctuation(texteInitial));
  const vide = texte.trim() === "";

  return (
    <Ecran fond="page">
      <EnTete onFermer={onFermer} />
      <Form action="/reponse" onSubmit={onEnvoi} className="flex flex-1 flex-col px-4">
        <h2 {...ATTRIBUTS_TITRE} className="mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.01em] focus:outline-none">
          C’est bien ça&nbsp;?
        </h2>

        <div className="mt-5 rounded-[28px] border-2 border-edge bg-card px-5 pt-[18px] pb-4 shadow-soft transition-shadow focus-within:border-leaf focus-within:shadow-[0_0_0_4px_var(--glow),var(--sh)]">
          <label htmlFor="question-voix" className="block text-[13px] leading-[18px] font-bold text-ink-2">
            Ta question
          </label>
          <textarea
            id="question-voix"
            name="q"
            rows={3}
            maxLength={LONGUEUR_MAX_QUESTION}
            value={texte}
            onChange={(evenement) => setTexte(evenement.target.value)}
            onKeyDown={(evenement) => {
              // Entrée cherche la réponse (Maj + Entrée n'est pas utile : la question tient sur une ligne).
              if (evenement.key === "Enter" && !evenement.nativeEvent.isComposing) {
                evenement.preventDefault();
                if (!vide) evenement.currentTarget.form?.requestSubmit();
              }
            }}
            className="mt-1.5 block min-h-24 w-full resize-none bg-transparent text-2xl leading-8 font-semibold text-ink focus:outline-none"
          />
        </div>

        <p className="mx-1 mt-3.5 flex items-start gap-2.5 text-sm leading-5 text-ink-2">
          <Icon name="info" className="flex-none text-leaf" />
          Je comprends surtout le français. Corrige un mot si besoin.
        </p>

        <div className="min-h-4 flex-1" />

        <button type="submit" disabled={vide} className={`${classesBouton("principal", "grand")} disabled:opacity-50`}>
          <Icon name="loupe" size={22} strokeWidth={2.4} />
          Chercher la réponse
        </button>
        <button type="button" onClick={onRecommencer} className={classesBouton("secondaire", "grand", "mt-3")}>
          <Icon name="micro" size={22} />
          Parler à nouveau
        </button>

        <p className="pt-3 pb-5 text-center text-[13px] leading-[18px] text-ink-3">
          Information indicative, à vérifier avant de te déplacer.
        </p>
      </Form>
    </Ecran>
  );
}

/** Le micro ou la transcription n'a pas marché : on dit pourquoi et quoi faire (réessayer ou écrire). */
export function VoixErreur({
  code,
  onReessayer,
  onEcrire,
  onFermer,
}: {
  code: CodeErreurVoix;
  onReessayer: () => void;
  onEcrire: () => void;
  onFermer: () => void;
}) {
  const { message, peutReessayer } = erreurDeVoix(code);

  return (
    <Ecran fond="page">
      <EnTete onFermer={onFermer} />
      {/* Le groupe reçoit le focus : le lecteur d'écran lit le titre puis le message. */}
      <div
        role="group"
        aria-labelledby="titre-voix"
        aria-describedby="message-voix"
        tabIndex={-1}
        data-titre-voix=""
        className="flex flex-1 flex-col items-center justify-center px-4 pb-8 text-center focus:outline-none"
      >
        <span aria-hidden="true" className="flex size-24 items-center justify-center rounded-full bg-tint-2 text-leaf-deep">
          <Icon name="micro" size={44} strokeWidth={2} />
        </span>
        <h2 id="titre-voix" className="mt-5 text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
          Je n’ai pas pu t’écouter
        </h2>
        <p id="message-voix" className="mt-2 max-w-[320px] text-[17px] leading-[26px] text-ink-2">
          {message}
        </p>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-8">
        {peutReessayer ? (
          <button type="button" onClick={onReessayer} className={classesBouton("principal", "grand")}>
            <Icon name="micro" size={22} />
            Réessayer
          </button>
        ) : null}
        <button
          type="button"
          onClick={onEcrire}
          className={classesBouton(peutReessayer ? "secondaire" : "principal", "grand")}
        >
          <Icon name="crayon" size={22} />
          Écrire ma question
        </button>
      </div>
    </Ecran>
  );
}
