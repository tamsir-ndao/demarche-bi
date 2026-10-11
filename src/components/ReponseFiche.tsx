import type { Degrade } from "@/lib/ai/ask";
import {
  estAConfirmer,
  notesDeLaFiche,
  resumeCoutDelai,
  type StatutAffichage,
} from "@/lib/fiches/affichage";
import type { Fiche } from "@/lib/fiches/schema";
import { typographie } from "@/lib/texte";
import { Carte } from "./Carte";
import { CarteDemarche } from "./CarteDemarche";
import { Etapes } from "./Etapes";
import { FaitsCles } from "./FaitsCles";
import { Icon, iconeCategorie } from "./Icon";
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
  /** La phrase qui répond à la question, écrite par l'IA puis vérifiée ; sans elle, le résumé de la fiche la remplace. */
  intro: string | null;
  /** Pourquoi la phrase manque quand l'IA est trop sollicitée ou en panne (sinon `null`). */
  degrade: Degrade;
};

const MESSAGES_DEGRADE = {
  saturee: "L’assistant est très sollicité en ce moment. Voici la fiche, sans phrase de réponse.",
  indisponible: "L’assistant ne répond pas pour l’instant. Voici la fiche, sans phrase de réponse.",
} satisfies Record<NonNullable<Degrade>, string>;

/** Dit pourquoi la réponse arrive sans phrase d'introduction : la fiche, elle, reste complète. */
function NoteAssistant({ degrade }: { degrade: NonNullable<Degrade> }) {
  return (
    <aside aria-label="Assistant" className="mt-4 flex gap-3 rounded-[20px] border-[1.5px] border-edge px-4 py-3.5">
      <Icon name="info" size={24} strokeWidth={2} className="mt-px flex-none text-leaf" />
      <p className="min-w-0 text-[15px] leading-[22px] text-ink-2">{MESSAGES_DEGRADE[degrade]}</p>
    </aside>
  );
}

/** La réponse : tout vient de la fiche, avec ses sources. Seule la phrase d'introduction est écrite par l'IA, et vérifiée. */
export function ReponseFiche({ fiche, statut, autres, intro, degrade }: ReponseFicheProps) {
  const notesAConfirmer = notesDeLaFiche(fiche.corps).filter(estAConfirmer);

  return (
    <>
      {degrade ? <NoteAssistant degrade={degrade} /> : null}

      <Carte aria-labelledby="titre-reponse" className="mt-4">
        <PastilleStatut statut={statut} />
        <h1 id="titre-reponse" className="mt-3 text-[26px] leading-8 font-bold tracking-[-0.01em]">
          {fiche.titre}
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">{intro ? typographie(intro) : fiche.resume}</p>
        {intro ? (
          <p className="mt-1.5 text-[13px] leading-[18px] text-ink-3">Phrase écrite par l’IA, d’après la fiche.</p>
        ) : null}
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
