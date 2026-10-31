import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoutonPartager } from "@/components/BoutonPartager";
import { Carte } from "@/components/Carte";
import { Etapes } from "@/components/Etapes";
import { FaitsCles } from "@/components/FaitsCles";
import { NoteAConfirmer } from "@/components/NoteAConfirmer";
import { PageShell } from "@/components/PageShell";
import { PastilleCategorie, PastilleStatut } from "@/components/Pastilles";
import { Pieces } from "@/components/Pieces";
import { Recherche } from "@/components/Recherche";
import { SectionRepliable } from "@/components/SectionRepliable";
import { SourcesRepliables } from "@/components/Sources";
import { ficheAConfirmer, MISE_EN_GARDE, notesDeLaFiche, notesPourUsager, statutAffichage } from "@/lib/fiches/affichage";
import { ficheAffichable, maintenant } from "@/lib/fiches/disponibles";
import { loadFiches } from "@/lib/fiches/load";

// Chaque fiche a sa page, créée à la construction du site. Les fiches non montrables (brouillons en
// production) restent dans la liste : leur page répond « introuvable », car Next exige au moins un chemin.
export async function generateStaticParams() {
  return loadFiches().fiches.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/demarches/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const fiche = ficheAffichable(slug);
  return fiche ? { title: fiche.titre, description: fiche.resume } : {};
}

export default function Page({ params }: PageProps<"/demarches/[slug]">) {
  return (
    <PageShell actif="question" sansMenu retour={{ href: "/", libelle: "Retour à la conversation" }}>
      {/* Le cadre de la page part tout de suite ; la fiche suit, même pour une adresse qu'on ne connaît pas. */}
      <Suspense fallback={<Recherche />}>
        <Demarche params={params} />
      </Suspense>
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}

async function Demarche({ params }: Pick<PageProps<"/demarches/[slug]">, "params">) {
  const { slug } = await params;
  const fiche = ficheAffichable(slug);
  if (!fiche) notFound();

  const statut = statutAffichage(fiche, await maintenant());
  const notesASavoir = notesPourUsager(notesDeLaFiche(fiche.corps));

  return (
    <>
      {/* Une page courte : l'essentiel en une ligne par sujet, chacun s'ouvre d'un toucher. Ce qui est à confirmer reste visible. */}
      <Carte aria-labelledby="titre-fiche" className="mt-2">
        <div className="flex flex-wrap gap-2">
          <PastilleStatut statut={statut} />
          <PastilleCategorie categorie={fiche.categorie} />
        </div>
        <h1 id="titre-fiche" className="mt-3 text-[26px] leading-8 font-bold tracking-[-0.01em]">
          {fiche.titre}
        </h1>
        <p className="mt-2 text-[15px] leading-[22px] text-ink-2">{fiche.resume}</p>
        {ficheAConfirmer(fiche) ? <NoteAConfirmer texte={MISE_EN_GARDE} /> : null}
      </Carte>

      <div className="mt-3 flex flex-col gap-2.5">
        <SectionRepliable icone="billet" titre="Coût, délai et lieu" detail="L’essentiel">
          <FaitsCles fiche={fiche} />
        </SectionRepliable>
        {fiche.pieces.length > 0 ? (
          <SectionRepliable icone="dossier" titre="Ce qu’il faut apporter" detail={fiche.pieces.length === 1 ? "1 pièce" : `${fiche.pieces.length} pièces`}>
            <Pieces pieces={fiche.pieces} />
          </SectionRepliable>
        ) : null}
        <SectionRepliable icone="fleche-droite" titre="Les étapes" detail={fiche.etapes.length === 1 ? "1 étape" : `${fiche.etapes.length} étapes, dans l’ordre`}>
          <div className="pt-1 pl-1.5">
            <Etapes etapes={fiche.etapes} />
          </div>
        </SectionRepliable>
        {notesASavoir.length > 0 ? (
          <SectionRepliable icone="info" titre="À savoir" detail={notesASavoir.length === 1 ? "1 précision" : `${notesASavoir.length} précisions`}>
            <ul className="list-disc space-y-2.5 pl-5 text-[15px] leading-[22px] text-ink-2 marker:text-leaf">
              {notesASavoir.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </SectionRepliable>
        ) : null}
        <SourcesRepliables sources={fiche.sources} />
      </div>

      <BoutonPartager fiche={fiche} className="mt-3" />
    </>
  );
}
