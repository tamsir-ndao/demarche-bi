import { typographie } from "@/lib/texte";
import { preparerLaLecture, scriptHorsDomaine } from "@/lib/voix/lecture";
import { BoutonEcouter } from "./BoutonEcouter";
import { Carte } from "./Carte";
import { Icon } from "./Icon";
import { LienBouton } from "./LienBouton";

/**
 * Quand la question n'a aucun rapport avec les démarches administratives : on le dit poliment. `message` : une phrase
 * écrite pour la question (et vérifiée), qui remplace la phrase habituelle. Pas d'invitation à proposer une démarche :
 * le sujet n'en est pas une. (Les mêmes phrases sont dans lib/voix/lecture.)
 */
export function HorsDomaine({ message }: { message?: string }) {
  return (
    <>
      <Carte aria-labelledby="titre-hors-domaine" className="mt-4 px-5 py-6">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-leaf"
        >
          <Icon name="info" size={30} strokeWidth={2} />
        </span>
        <h1 id="titre-hors-domaine" className="mt-4 text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
          Ce n’est pas mon domaine
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">
          {message
            ? typographie(message)
            : "Je réponds aux questions sur les démarches administratives au Sénégal : papiers, certificats, permis…"}
        </p>
        <BoutonEcouter lignes={preparerLaLecture(scriptHorsDomaine(message))} className="mt-4" />
      </Carte>

      <LienBouton href="/" icone="bulle" className="mt-5">
        Poser une autre question
      </LienBouton>
      <LienBouton href="/demarches" variante="secondaire" icone="livre" className="mt-3">
        Voir les démarches que je connais
      </LienBouton>
    </>
  );
}
