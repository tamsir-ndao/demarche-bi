import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { BulleQuestion } from "@/components/BulleQuestion";
import { JeNeSaisPas } from "@/components/JeNeSaisPas";
import { PageShell } from "@/components/PageShell";
import { Precision, PrecisionGenerale } from "@/components/Precision";
import { QuestionForm } from "@/components/QuestionForm";
import { Recherche } from "@/components/Recherche";
import { ReponseFiche } from "@/components/ReponseFiche";
import type { Reponse as ReponseDuSite } from "@/lib/ai/ask";
import { repondreALaQuestion } from "@/lib/ai/serveur";
import { visiteurDepuis } from "@/lib/ai/service";
import { statutAffichage } from "@/lib/fiches/affichage";
import { maintenant } from "@/lib/fiches/disponibles";
import { nettoyerQuestion, nettoyerSlug } from "@/lib/texte";

export const metadata: Metadata = {
  title: "Ta réponse",
  // Les questions sont dans l'adresse : elles n'ont rien à faire dans un moteur de recherche.
  robots: { index: false },
};

export default function Page({ searchParams }: PageProps<"/reponse">) {
  return (
    <PageShell actif="question" retour={{ href: "/", libelle: "Retour" }}>
      {/* La question n'est connue qu'à la demande : pendant ce temps, on montre l'écran de recherche. */}
      <Suspense fallback={<Recherche />}>
        <Reponse searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Reponse({ searchParams }: Pick<PageProps<"/reponse">, "searchParams">) {
  const parametres = await searchParams;
  const question = nettoyerQuestion(parametres.q);
  if (question === "") return <QuestionVide />;

  const reponse = await repondreALaQuestion(question, {
    ficheSlug: nettoyerSlug(parametres.fiche),
    visiteur: visiteurDepuis(await headers()),
  });

  return (
    <>
      <BulleQuestion question={question} />
      <Resultat question={question} reponse={reponse} />
    </>
  );
}

async function Resultat({ question, reponse }: { question: string; reponse: ReponseDuSite }) {
  switch (reponse.type) {
    case "fiche":
      return (
        <ReponseFiche
          fiche={reponse.fiche}
          statut={statutAffichage(reponse.fiche, await maintenant())}
          autres={reponse.autres}
          intro={reponse.intro}
          degrade={reponse.degrade}
        />
      );
    case "precision":
      return <Precision question={reponse.question} questionPosee={question} options={reponse.options} />;
    case "precision_generale":
      return <PrecisionGenerale question={reponse.question} questionPosee={question} />;
    case "inconnue":
      return <JeNeSaisPas />;
  }
}

function QuestionVide() {
  return (
    <section className="mt-6">
      <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.01em]">Quelle démarche te bloque&nbsp;?</h1>
      <p className="mt-2 text-[17px] leading-[26px] text-ink-2">Écris ta question, je te réponds.</p>
      <div className="mt-4">
        <QuestionForm id="question-vide" />
      </div>
    </section>
  );
}
