import {
  estAConfirmer,
  notesDeLaFiche,
  resumeCoutDelai,
  type StatutAffichage,
} from "@/lib/fiches/affichage";
import type { Fiche } from "@/lib/fiches/schema";
import { Carte } from "./Carte";
import { CarteDemarche } from "./CarteDemarche";
import { Etapes } from "./Etapes";
import { FaitsCles } from "./FaitsCles";
import { iconeCategorie } from "./Icon";
import { LienBouton } from "./LienBouton";
import { NoteAConfirmer } from "./NoteAConfirmer";
import { PastilleStatut } from "./Pastilles";
import { Pieces } from "./Pieces";
import { SourcesRepliables } from "./Sources";

type ReponseFicheProps = {
  fiche: Fiche;
  statut: StatutAffichage;
  /** D'autres fiches qui pourraient aussi aider. */
  autres: Fiche[];
};

/** La réponse : tout vient de la fiche, avec ses sources. Rien n'est ajouté ni deviné. */
export function ReponseFiche({ fiche, statut, autres }: ReponseFicheProps) {
  const notesAConfirmer = notesDeLaFiche(fiche.corps).filter(estAConfirmer);

  return (
    <>
      <Carte aria-labelledby="titre-reponse" className="mt-4">
        <PastilleStatut statut={statut} />
        <h1 id="titre-reponse" className="mt-3 text-[26px] leading-8 font-bold tracking-[-0.01em]">
          {fiche.titre}
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">{fiche.resume}</p>
        <FaitsCles fiche={fiche} />
        {notesAConfirmer.map((note) => (
          <NoteAConfirmer key={note} texte={note} />
        ))}
      </Carte>

      <Carte className="mt-4">
        {fiche.pieces.length > 0 ? (
          <>
            <h2 className="mb-1 text-xl leading-7 font-bold">Ce qu’il faut apporter</h2>
            <Pieces pieces={fiche.pieces} />
          </>
        ) : null}
        <h2 className={`mb-4 text-xl leading-7 font-bold ${fiche.pieces.length > 0 ? "mt-6" : ""}`}>Les étapes</h2>
        <Etapes etapes={fiche.etapes} />
      </Carte>

      <div className="mt-4">
        <SourcesRepliables sources={fiche.sources} />
      </div>

      {autres.length > 0 ? (
        <section aria-labelledby="titre-voir-aussi" className="mt-6">
          <h2 id="titre-voir-aussi" className="mb-3 px-1 text-base leading-[22px] font-bold">
            Voir aussi
          </h2>
          <ul className="flex flex-col gap-3">
            {autres.map((autre) => (
              <li key={autre.slug}>
                <CarteDemarche
                  href={`/demarches/${autre.slug}`}
                  titre={autre.titre}
                  detail={resumeCoutDelai(autre)}
                  icone={iconeCategorie(autre.categorie)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LienBouton href="/" icone="bulle" className="mt-5">
        Poser une autre question
      </LienBouton>
      <LienBouton href={`/demarches/${fiche.slug}`} variante="lien" className="mt-2">
        Voir tous les détails
      </LienBouton>
    </>
  );
}
