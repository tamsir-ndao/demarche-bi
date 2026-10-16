import Link from "next/link";
import { Bienvenue } from "@/components/Bienvenue";
import { BoutonVoix } from "@/components/BoutonVoix";
import { PageShell } from "@/components/PageShell";
import { QuestionForm } from "@/components/QuestionForm";

// Trois démarches parmi les plus demandées, toutes couvertes par une fiche : un exemple ne doit jamais mener à « je ne sais pas ».
const EXEMPLES = ["J’ai perdu ma carte d’identité", "Comment faire mon passeport ?", "Un extrait de naissance, ça coûte combien ?"];

export default function Accueil() {
  return (
    <PageShell actif="question" large>
      {/*
        Téléphone : tout empilé et centré. Ordinateur : deux colonnes, centrées verticalement. À gauche, l'accroche et
        l'action principale (la voix) ; à droite, l'autre façon de faire (écrire) et des exemples. Un « ou » vertical
        relie les deux, comme la ligne « ou » sur téléphone.
      */}
      <div className="mx-auto my-auto flex w-full max-w-[640px] flex-col items-center pb-16 text-center lg:mt-auto lg:mb-0 lg:grid lg:max-w-[1120px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-12 lg:pb-0 lg:text-left xl:gap-x-16">
        <section aria-labelledby="titre-accueil" className="flex w-full flex-col items-center lg:items-start">
          <h1
            id="titre-accueil"
            className="text-[32px] leading-[38px] font-bold tracking-[-0.01em] text-balance lg:text-[52px] lg:leading-[58px] lg:tracking-[-0.02em] xl:text-[56px] xl:leading-[62px]"
          >
            Quelle démarche te bloque&nbsp;?
          </h1>
          <p className="mt-2 text-[17px] leading-6 text-ink-2 lg:mt-3 lg:text-[22px] lg:leading-8">
            Parle ou écris, je te réponds.
          </p>
          <div className="mt-5 lg:mt-9">
            <BoutonVoix idChampQuestion="question-accueil" />
          </div>
        </section>

        <div aria-hidden="true" className="mt-4 flex w-full items-center gap-3 text-sm leading-5 text-ink-3 lg:mt-0 lg:h-full lg:min-h-[280px] lg:w-auto lg:flex-col lg:self-stretch">
          <span className="h-px flex-1 bg-line lg:h-auto lg:w-px" />
          ou
          <span className="h-px flex-1 bg-line lg:h-auto lg:w-px" />
        </div>

        <section aria-labelledby="titre-ecrire" className="mt-3 w-full lg:mt-0 lg:max-w-[520px] lg:justify-self-end">
          <h2 id="titre-ecrire" className="sr-only">
            Écrire ta question
          </h2>
          <QuestionForm id="question-accueil" />
          <div className="mt-5">
            <p id="titre-exemples" className="mb-2 text-sm leading-5 text-ink-2">
              Par exemple
            </p>
            <ul aria-labelledby="titre-exemples" className="flex flex-wrap justify-center gap-2 lg:justify-start">
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
          </div>
        </section>
      </div>

      {/* Trois promesses en une ligne (ordinateur seulement) ; le détail est sur la page « À propos », pour garder l'accueil léger. */}
      <p className="mx-auto mt-16 mb-auto hidden w-full max-w-[760px] flex-wrap items-center justify-center gap-x-3 gap-y-2 pb-8 text-center text-[15px] leading-[22px] text-ink-2 lg:flex">
        <span>Des sources officielles</span>
        <span aria-hidden="true">·</span>
        <span>Une date de vérification</span>
        <span aria-hidden="true">·</span>
        <span>Si je ne sais pas, je te le dis</span>
        <span aria-hidden="true">·</span>
        <Link href="/a-propos" className="font-semibold text-leaf underline-offset-4 hover:underline">
          En savoir plus
        </Link>
      </p>

      {/* Présentation en trois paliers au premier lancement (ou `/?presentation`) : rien côté serveur, la page reste prérendue. */}
      <Bienvenue />
    </PageShell>
  );
}
