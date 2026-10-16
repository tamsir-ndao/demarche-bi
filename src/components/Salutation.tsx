import { typographie } from "@/lib/texte";
import { preparerLaLecture, scriptSalutation } from "@/lib/voix/lecture";
import { BoutonEcouter } from "./BoutonEcouter";
import { Carte } from "./Carte";
import { Icon } from "./Icon";
import { LienBouton } from "./LienBouton";
import { QuestionForm } from "./QuestionForm";

/**
 * Quand l'utilisateur envoie une simple salutation (bonjour, salam aleykoum, nanga def...) :
 * on lui répond chaleureusement et on l'invite à poser sa question administrative.
 */
export function Salutation({ message }: { message?: string }) {
  return (
    <>
      <Carte aria-labelledby="titre-salutation" className="mt-4 px-5 py-6">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-leaf"
        >
          <Icon name="personnes" size={30} strokeWidth={2} />
        </span>
        <h1 id="titre-salutation" className="mt-4 text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
          Salam aleykoum&nbsp;!
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">
          {message
            ? typographie(message)
            : "Comment puis-je t’aider aujourd’hui ? Pose-moi ta question sur tes démarches administratives au Sénégal."}
        </p>
        <BoutonEcouter lignes={preparerLaLecture(scriptSalutation(message))} className="mt-4" />

        <div className="mt-6">
          <QuestionForm id="question-salutation" />
        </div>
      </Carte>

      <LienBouton href="/demarches" variante="secondaire" icone="livre" className="mt-5">
        Voir les démarches que je connais
      </LienBouton>
    </>
  );
}
