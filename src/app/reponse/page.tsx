import type { Metadata } from "next";
import { Suspense } from "react";
import { BulleQuestion } from "@/components/BulleQuestion";
import { JeNeSaisPas } from "@/components/JeNeSaisPas";
import { PageShell } from "@/components/PageShell";
import { QuestionForm } from "@/components/QuestionForm";
import { Recherche } from "@/components/Recherche";
import { ReponseFiche } from "@/components/ReponseFiche";
import { brouillonsAutorises, fichePourAffichage, statutAffichage } from "@/lib/fiches/affichage";
import { maintenant } from "@/lib/fiches/disponibles";
import { loadFiches } from "@/lib/fiches/load";
import { searchFiches } from "@/lib/fiches/search";
import { nettoyerQuestion } from "@/lib/texte";

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
  const question = nettoyerQuestion((await searchParams).q);
  if (question === "") return <QuestionVide />;

  const resultats = searchFiches(loadFiches().fiches, question, { inclureBrouillons: brouillonsAutorises() });
  const [meilleur, ...autres] = resultats;

  return (
    <>
      <BulleQuestion question={question} />
      {meilleur ? (
        <ReponseFiche
          fiche={fichePourAffichage(meilleur.fiche)}
          statut={statutAffichage(meilleur.fiche, await maintenant())}
          autres={autres.map((resultat) => fichePourAffichage(resultat.fiche))}
        />
      ) : (
        <JeNeSaisPas />
      )}
    </>
  );
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
