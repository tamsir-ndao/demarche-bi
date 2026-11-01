import type { Metadata } from "next";
import { lireSansReponse, type LigneSansReponse } from "@/lib/admin/donnees";
import { lireAdmin } from "@/lib/admin/serveur";
import { Cadre, Carte, Indisponible, Vide } from "../Cadre";

export const metadata: Metadata = { title: "Sans réponse", robots: { index: false, follow: false } };

function Liste({ lignes, vide }: { lignes: LigneSansReponse[]; vide: string }) {
  if (lignes.length === 0) return <Vide>{vide}</Vide>;
  return (
    <ul data-confidentiel className="divide-y divide-line">
      {lignes.map(({ question, fois }) => (
        <li key={question} className="flex justify-between gap-3 py-2.5 text-[14px] leading-5">
          <span className="min-w-0 break-words">{question}</span>
          <span className="flex-none font-semibold">{fois}×</span>
        </li>
      ))}
    </ul>
  );
}

async function Donnees() {
  const listes = await lireAdmin(lireSansReponse);
  if (!listes) return <Indisponible />;
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2 lg:gap-4">
      <Carte titre="Démarches qui manquent" sousTitre="Des démarches sans fiche : à écrire en priorité.">
        <Liste lignes={listes.manques} vide="Aucune pour l’instant." />
      </Carte>
      <Carte titre="Hors démarches" sousTitre="Sujets sans rapport ou demandes refusées.">
        <Liste lignes={listes.horsSujet} vide="Aucun pour l’instant." />
      </Carte>
    </div>
  );
}

export default function Page() {
  return (
    <Cadre actif="sans-reponse" titre="Sans réponse" sousTitre="30 derniers jours. Confidentiel : ne partage pas cet écran.">
      <Donnees />
    </Cadre>
  );
}
