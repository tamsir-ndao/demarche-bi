import { typographie } from "@/lib/texte";
import { preparerLaLecture, scriptInterdit } from "@/lib/voix/lecture";
import { BoutonEcouter } from "./BoutonEcouter";
import { Carte } from "./Carte";
import { Icon } from "./Icon";
import { LienBouton } from "./LienBouton";

/**
 * Quand la question concerne une pratique frauduleuse, falsifiée, corrompue ou illégale :
 * on refuse poliment et fermement en rappelant l'interdiction légale.
 */
export function Interdit({ message }: { message?: string }) {
  return (
    <>
      <Carte aria-labelledby="titre-interdit" className="mt-4 px-5 py-6">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-leaf"
        >
          <Icon name="bouclier" size={30} strokeWidth={2} />
        </span>
        <h1 id="titre-interdit" className="mt-4 text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
          Interdit par la loi
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">
          {message
            ? typographie(message)
            : "Cette démarche est interdite par la loi. Je ne peux pas t’aider pour une pratique frauduleuse ou illégale."}
        </p>
        <BoutonEcouter lignes={preparerLaLecture(scriptInterdit(message))} className="mt-4" />
      </Carte>

      <LienBouton href="/" icone="bulle" className="mt-5">
        Poser une autre question
      </LienBouton>
      <LienBouton href="/demarches" variante="secondaire" icone="livre" className="mt-3">
        Voir les démarches légales
      </LienBouton>
    </>
  );
}
