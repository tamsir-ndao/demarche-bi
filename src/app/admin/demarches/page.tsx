import type { Metadata } from "next";
import { lireDemarches, pourcent } from "@/lib/admin/donnees";
import { lireAdmin } from "@/lib/admin/serveur";
import { ficheAffichable } from "@/lib/fiches/disponibles";
import { Cadre, Carte, Indisponible, Vide } from "../Cadre";

export const metadata: Metadata = { title: "Démarches", robots: { index: false, follow: false } };

async function Donnees() {
  const demarches = await lireAdmin((requete, maintenantMs) => lireDemarches(requete, maintenantMs));
  if (!demarches) return <Indisponible />;
  const total = demarches.reduce((somme, { questions }) => somme + questions, 0);
  const max = Math.max(1, ...demarches.map(({ questions }) => questions));
  return (
    <Carte titre="Classement" sousTitre="30 derniers jours">
      {demarches.length === 0 ? <Vide>Pas encore de données.</Vide> : (
        <ul className="flex flex-col gap-4">
          {demarches.map(({ slug, questions, passages }) => (
            <li key={slug}>
              <div className="flex justify-between gap-3 text-[15px] leading-[22px]">
                <span className="min-w-0 font-semibold break-words">{ficheAffichable(slug)?.titre ?? slug}</span>
                <span className="flex-none font-bold">{questions}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-tint"><div className="h-2 rounded-full bg-brand" style={{ width: `${(questions / max) * 100}%` }} /></div>
              <p className="mt-1 text-[13px] leading-[18px] text-ink-2">
                {pourcent(questions, total)} % des demandes · {passages} passage{passages > 1 ? "s" : ""} vers e-Sénégal
              </p>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  );
}

export default function Page() {
  return (
    <Cadre actif="demarches" titre="Démarches" sousTitre="Ce que les usagers demandent le plus.">
      <Donnees />
    </Cadre>
  );
}
