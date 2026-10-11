import type { Metadata } from "next";
import { Carte } from "@/components/Carte";
import { iconeCategorie } from "@/components/Icon";
import { ListeDemarches, type DemarcheListee } from "@/components/ListeDemarches";
import { PageShell } from "@/components/PageShell";
import { ProposerUneDemarche } from "@/components/ProposerUneDemarche";
import { libelleCategorie, resumeCoutDelai } from "@/lib/fiches/affichage";
import { fichesAffichables } from "@/lib/fiches/disponibles";
import { CATEGORIES } from "@/lib/fiches/schema";
import { simplifier } from "@/lib/texte";

export const metadata: Metadata = { title: "Les démarches" };

export default function Page() {
  const fiches = fichesAffichables();
  const demarches: DemarcheListee[] = fiches.map((fiche) => ({
    slug: fiche.slug,
    titre: fiche.titre,
    detail: resumeCoutDelai(fiche),
    icone: iconeCategorie(fiche.categorie),
    categorie: fiche.categorie,
    recherche: simplifier([fiche.titre, fiche.resume, ...fiche.mots_cles, libelleCategorie(fiche.categorie)].join(" ")),
  }));
  const categories = CATEGORIES.filter((categorie) => fiches.some((fiche) => fiche.categorie === categorie)).map(
    (categorie) => ({ id: categorie, libelle: libelleCategorie(categorie) }),
  );

  return (
    <PageShell actif="demarches">
      <h1 className="mx-1 mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.01em]">Les démarches</h1>

      {fiches.length > 0 ? (
        <ListeDemarches demarches={demarches} categories={categories} />
      ) : (
        <Carte className="mt-4">
          <p className="text-[17px] leading-6 font-bold">Pas encore de démarche ici.</p>
          <p className="mt-1 text-[15px] leading-[22px] text-ink-2">Chaque démarche est relue avant d’apparaître.</p>
        </Carte>
      )}

      <ProposerUneDemarche disposition="bloc" />
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}
