import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Recherche } from "@/components/Recherche";
import { ResultatsHorsConnexion } from "@/components/ResultatsHorsConnexion";

export const metadata: Metadata = {
  title: "Pas de connexion",
  // Une page de secours, avec la question de la personne dans l'adresse : rien à faire dans un moteur de recherche.
  robots: { index: false },
};

/** Là où une question arrive quand le téléphone n'a pas de réseau (voir public/sw.js). La recherche se fait dans le navigateur. */
export default function Page() {
  return (
    <PageShell actif="question" retour={{ href: "/", libelle: "Retour" }}>
      {/* La question est lue dans l'adresse, côté navigateur : en attendant, l'écran de recherche. */}
      <Suspense fallback={<Recherche />}>
        <ResultatsHorsConnexion />
      </Suspense>
    </PageShell>
  );
}
