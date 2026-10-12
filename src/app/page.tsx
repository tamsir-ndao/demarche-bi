import Link from "next/link";
import { BoutonVoix } from "@/components/BoutonVoix";
import { CarteArgument } from "@/components/CarteArgument";
import { PageShell } from "@/components/PageShell";
import { QuestionForm } from "@/components/QuestionForm";

const EXEMPLES = ["J’ai perdu ma carte d’identité", "Le NINEA, ça prend combien de jours ?", "Visa pour la France"];

export default function Accueil() {
  return (
    <PageShell actif="question" large>
      <div className="mx-auto my-auto flex w-full max-w-[640px] flex-col items-center pb-16 text-center lg:mt-16 lg:mb-0 lg:max-w-[760px] lg:pb-0">
        <h1 className="text-[32px] leading-[38px] font-bold tracking-[-0.01em] text-balance lg:max-w-[640px] lg:text-[56px] lg:leading-[62px] lg:tracking-[-0.02em]">
          Quelle démarche te bloque&nbsp;?
        </h1>
        <p className="mt-2 text-[17px] leading-6 text-ink-2 lg:mt-3 lg:text-[22px] lg:leading-8">
          Parle ou écris, je te réponds.
        </p>

        <div className="mt-5 lg:mt-8">
          <BoutonVoix idChampQuestion="question-accueil" />
        </div>

        <div
          aria-hidden="true"
          className="mt-4 flex w-full items-center gap-3 text-sm leading-5 text-ink-3 lg:max-w-[600px]"
        >
          <span className="h-px flex-1 bg-line" />
          ou
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="mt-3 w-full lg:max-w-[600px]">
          <QuestionForm id="question-accueil" />
        </div>

        <section aria-labelledby="titre-exemples" className="mt-5 w-full">
          <p id="titre-exemples" className="mb-2 text-sm leading-5 text-ink-2">
            Par exemple
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {EXEMPLES.map((exemple) => (
              <li key={exemple}>
                <Link
                  href={`/reponse?q=${encodeURIComponent(exemple)}`}
                  className="press flex min-h-11 items-center rounded-full border border-line bg-card px-3.5 text-sm leading-5 font-semibold transition-colors hover:bg-tint-2 lg:px-4 lg:text-[15px]"
                >
                  {exemple}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section
        aria-label="Pourquoi te fier à Démarche-Bi"
        className="mx-auto mt-[72px] hidden w-full max-w-[1200px] grid-cols-3 gap-6 lg:grid"
      >
        <CarteArgument grande icone="bouclier" titre="Des sources officielles" texte="Chaque réponse montre d’où elle vient." />
        <CarteArgument grande icone="calendrier" titre="Une date de vérification" texte="Tu vois quand l’information a été relue." />
        <CarteArgument grande pointille icone="aide" titre="Je ne devine pas" texte="Si je ne sais pas, je te le dis." />
      </section>

      <div className="hidden min-h-12 flex-1 lg:block" />
    </PageShell>
  );
}
