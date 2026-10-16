import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoutonPartager } from "@/components/BoutonPartager";
import { Carte } from "@/components/Carte";
import { Etapes } from "@/components/Etapes";
import { FaitsCles } from "@/components/FaitsCles";
import { LienBouton } from "@/components/LienBouton";
import { NoteAConfirmer } from "@/components/NoteAConfirmer";
import { PageShell } from "@/components/PageShell";
import { PastilleCategorie, PastilleStatut } from "@/components/Pastilles";
import { Pieces } from "@/components/Pieces";
import { Recherche } from "@/components/Recherche";
import { ListeSources } from "@/components/Sources";
import { estAConfirmer, notesDeLaFiche, statutAffichage } from "@/lib/fiches/affichage";
import { ficheAffichable, maintenant } from "@/lib/fiches/disponibles";
import { loadFiches } from "@/lib/fiches/load";
import { URL_SIGNALER, urlCorrectionFiche } from "@/lib/liens";

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
    <PageShell actif="demarches" retour={{ href: "/demarches", libelle: "Retour aux démarches" }}>
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
  const notes = notesDeLaFiche(fiche.corps);
  const notesAConfirmer = notes.filter(estAConfirmer);
  const notesASavoir = notes.filter((note) => !estAConfirmer(note));

  return (
    <>
      <Carte aria-labelledby="titre-fiche" className="mt-2">
        <div className="flex flex-wrap gap-2">
          <PastilleStatut statut={statut} />
          <PastilleCategorie categorie={fiche.categorie} />
        </div>
        <h1 id="titre-fiche" className="mt-3 text-[26px] leading-8 font-bold tracking-[-0.01em]">
          {fiche.titre}
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">{fiche.resume}</p>
        <FaitsCles fiche={fiche} />
        {notesAConfirmer.map((note) => (
          <NoteAConfirmer key={note} texte={note} />
        ))}
      </Carte>

      {fiche.pieces.length > 0 ? (
        <Carte aria-labelledby="titre-pieces" className="mt-4">
          <h2 id="titre-pieces" className="mb-1 text-xl leading-7 font-bold">
            Ce qu’il faut apporter
          </h2>
          <Pieces pieces={fiche.pieces} />
        </Carte>
      ) : null}

      <Carte aria-labelledby="titre-etapes" className="mt-4">
        <h2 id="titre-etapes" className="mb-4 text-xl leading-7 font-bold">
          Les étapes
        </h2>
        <Etapes etapes={fiche.etapes} />
      </Carte>

      {notesASavoir.length > 0 ? (
        <Carte aria-labelledby="titre-a-savoir" className="mt-4">
          <h2 id="titre-a-savoir" className="mb-3 text-xl leading-7 font-bold">
            À savoir
          </h2>
          <ul className="list-disc space-y-2.5 pl-5 text-[15px] leading-[22px] text-ink-2 marker:text-leaf">
            {notesASavoir.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Carte>
      ) : null}

      <Carte aria-labelledby="titre-sources" className="mt-4">
        <h2 id="titre-sources" className="mb-3 text-xl leading-7 font-bold">
          Sources officielles
        </h2>
        <ListeSources sources={fiche.sources} />
      </Carte>

      <Carte fond="teinte" aria-labelledby="titre-erreur" className="mt-4">
        <h2 id="titre-erreur" className="text-lg leading-6 font-bold">
          Tu vois une erreur&nbsp;?
        </h2>
        <p className="mt-1 text-[15px] leading-[22px] text-ink-2">Dis-le-nous, on corrige. Ce contenu est ouvert à tous.</p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <LienBouton href={URL_SIGNALER} externe variante="secondaire" taille="petit">
            Signaler une erreur
          </LienBouton>
          <LienBouton href={urlCorrectionFiche(fiche.slug)} externe variante="secondaire" taille="petit">
            Proposer une correction
          </LienBouton>
        </div>
      </Carte>

      <LienBouton href="/" icone="bulle" className="mt-5">
        Poser une question
      </LienBouton>
      <BoutonPartager fiche={fiche} className="mt-2" />
    </>
  );
}
