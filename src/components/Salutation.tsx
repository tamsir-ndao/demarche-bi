import { typographie } from "@/lib/texte";
import { preparerLaLecture, scriptSalutation } from "@/lib/voix/lecture";
import { BoutonEcouter } from "./BoutonEcouter";
import { Carte } from "./Carte";
import { Icon } from "./Icon";
import { LienBouton } from "./LienBouton";
import { QuestionForm } from "./QuestionForm";

/**
 * Quand l'utilisateur envoie une simple salutation (bonjour, salam aleykoum, nanga def...) :
 * on le salue en retour dans sa langue (`titre`) et on l'invite à poser sa question administrative (`message`).
 */
export function Salutation({ titre, message }: { titre: string; message: string }) {
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
          {/* Espace insécable avant le « ! » : le point d'exclamation ne passe jamais seul à la ligne. */}
          {typographie(titre).replace(" !", " !")}
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">{typographie(message)}</p>
        <BoutonEcouter lignes={preparerLaLecture(scriptSalutation(titre, message))} className="mt-4" />

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
