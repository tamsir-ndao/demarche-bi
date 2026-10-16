import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { AvisReponse } from "@/components/AvisReponse";
import { BulleQuestion } from "@/components/BulleQuestion";
import { HorsDomaine } from "@/components/HorsDomaine";
import { Interdit } from "@/components/Interdit";
import { JeNeSaisPas } from "@/components/JeNeSaisPas";
import { PageShell } from "@/components/PageShell";
import { Precision, PrecisionGenerale } from "@/components/Precision";
import { QuestionForm } from "@/components/QuestionForm";
import { Recherche } from "@/components/Recherche";
import { ReponseFiche } from "@/components/ReponseFiche";
import { Salutation } from "@/components/Salutation";
import type { Reponse as ReponseDuSite } from "@/lib/ai/ask";
import { repondreALaQuestion } from "@/lib/ai/serveur";
import { visiteurDepuis } from "@/lib/ai/service";
import { noterLaReponse } from "@/lib/avis/serveur";
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

  // La réponse dépend de l'heure (mémoire des questions, limite par visiteur) et d'un service externe :
  // on la calcule à la vraie demande, jamais pendant un préchargement ou un prérendu.
  await connection();
  const visiteur = visiteurDepuis(await headers());
  const reponse = await repondreALaQuestion(question, { ficheSlug: nettoyerSlug(parametres.fiche), visiteur });
  // Sans base de données (ou pour une question de précision), il n'y a pas d'identifiant et pas de barre d'avis.
  const journalId = noterLaReponse(question, reponse, visiteur);

  return (
    <>
      <BulleQuestion question={question} />
      <Resultat question={question} reponse={reponse} />
      {journalId ? <AvisReponse journalId={journalId} /> : null}
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
      return <JeNeSaisPas message={reponse.message} />;
    case "hors_domaine":
      return <HorsDomaine message={reponse.message} />;
    case "interdit":
      return <Interdit message={reponse.message} />;
    case "salutation":
      return <Salutation titre={reponse.titre} message={reponse.message} />;
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
