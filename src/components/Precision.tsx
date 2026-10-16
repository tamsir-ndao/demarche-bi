import { resumeCoutDelai } from "@/lib/fiches/affichage";
import type { Fiche } from "@/lib/fiches/schema";
import { typographie, urlReponse } from "@/lib/texte";
import { preparerLaLecture, scriptPrecision, scriptPrecisionGenerale } from "@/lib/voix/lecture";
import { BoutonEcouter } from "./BoutonEcouter";
import { BoutonVoix } from "./BoutonVoix";
import { CarteDemarche } from "./CarteDemarche";
import { ChoixVocal } from "./ChoixVocal";
import { iconeCategorie } from "./Icon";
import { LienBouton } from "./LienBouton";
import { QuestionForm } from "./QuestionForm";

const TITRE = "mt-5 px-1 text-[28px] leading-[34px] font-bold tracking-[-0.01em]";

/** Plusieurs démarches pourraient répondre : la personne choisit, et la réponse vient de la fiche choisie. (Les mêmes phrases sont dans lib/voix/lecture.) */
export function Precision({ question, questionPosee, options }: { question: string; questionPosee: string; options: Fiche[] }) {
  return (
    <section aria-labelledby="titre-precision">
      <h1 id="titre-precision" className={TITRE}>
        {typographie(question) || "Que veux-tu faire ?"}
      </h1>
      {/* La question se lit toute seule après une question vocale (enchainer : la fiche choisie se lira aussi), puis on peut répondre à la voix. */}
      <BoutonEcouter lignes={preparerLaLecture(scriptPrecision({ question, options }))} className="mt-4" enchainer />
      <div className="mt-4">
        <BoutonVoix variante="compact" prefixe={questionPosee} libelle="Répondre à voix haute" />
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {options.map((option) => (
          <li key={option.slug}>
            <ChoixVocal action="continuer">
              <CarteDemarche
                href={urlReponse(questionPosee, option.slug)}
                titre={option.titre}
                detail={resumeCoutDelai(option)}
                icone={iconeCategorie(option.categorie)}
              />
            </ChoixVocal>
          </li>
        ))}
        <li>
          <ChoixVocal action="arreter">
            <CarteDemarche href="/" titre="Autre chose" detail="Reformule ta question" icone="crayon" variante="autre" />
          </ChoixVocal>
        </li>
      </ul>
      <ChoixVocal action="arreter">
        <LienBouton href="/" variante="lien" className="mt-3">
          Annuler
        </LienBouton>
      </ChoixVocal>
    </section>
  );
}

/** La question est trop vague pour proposer des démarches : on demande un détail, le champ garde sa question. */
export function PrecisionGenerale({ question, questionPosee }: { question: string; questionPosee: string }) {
  return (
    <section aria-labelledby="titre-precision">
      <h1 id="titre-precision" className={TITRE}>
        {typographie(question) || "Peux-tu préciser ta question ?"}
      </h1>
      <p className="mt-2 px-1 text-[17px] leading-[26px] text-ink-2">Ajoute un détail, et je te réponds.</p>
      <BoutonEcouter lignes={preparerLaLecture(scriptPrecisionGenerale({ question }))} className="mt-4" enchainer />
      <div className="mt-4">
        <QuestionForm id="question-precise" valeurInitiale={questionPosee} />
      </div>
      <div className="mt-3">
        <BoutonVoix
          variante="compact"
          idChampQuestion="question-precise"
          prefixe={questionPosee}
          libelle="Répondre à voix haute"
        />
      </div>
      <LienBouton href="/demarches" variante="secondaire" icone="livre" className="mt-5">
        Voir les démarches que je connais
      </LienBouton>
    </section>
  );
}
