import { typographie } from "@/lib/texte";
import { preparerLaLecture, scriptInconnue } from "@/lib/voix/lecture";
import { BoutonEcouter } from "./BoutonEcouter";
import { Carte } from "./Carte";
import { Icon } from "./Icon";
import { LienBouton } from "./LienBouton";
import { ProposerUneDemarche } from "./ProposerUneDemarche";

/**
 * Quand aucune fiche ne répond à la question : on le dit franchement, sans rien inventer. `message` : une phrase écrite
 * pour la question (et vérifiée), qui remplace la phrase habituelle. (Les mêmes phrases sont dans lib/voix/lecture.)
 */
export function JeNeSaisPas({ message }: { message?: string }) {
  return (
    <>
      <Carte aria-labelledby="titre-je-ne-sais-pas" className="mt-4 px-5 py-6">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-leaf"
        >
          <Icon name="aide" size={30} strokeWidth={2} />
        </span>
        <h1 id="titre-je-ne-sais-pas" className="mt-4 text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
          Je ne sais pas encore
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">
          {message ? typographie(message) : "Je n’ai pas de source officielle pour ça. Je préfère te le dire plutôt que d’inventer."}
        </p>
        <BoutonEcouter lignes={preparerLaLecture(scriptInconnue(message))} className="mt-4" />
      </Carte>

      <LienBouton href="/demarches" icone="livre" className="mt-5">
        Voir les démarches que je connais
      </LienBouton>
      <LienBouton href="/" variante="secondaire" icone="bulle" className="mt-3">
        Poser une autre question
      </LienBouton>

      <ProposerUneDemarche disposition="ligne" />
    </>
  );
}
